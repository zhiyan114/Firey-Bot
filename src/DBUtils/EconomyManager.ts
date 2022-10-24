import { GuildMember, User } from 'discord.js';
import Mongoose from 'mongoose';
import { isConnected } from '../utils/DatabaseManager';

export type econType = {
    _id: string;
    points: number;
    lastGrantedPoint: Date;
}

const econSchema = new Mongoose.Schema<econType>({
    _id: {
        type: String,
        required: true,
    },
    points: {
        type: Number,
        required: true,
    },
    lastGrantedPoint: {
        type: Date,
        required: true,
    }
}, {_id: false})

export const econModel = Mongoose.model<econType>("economy",econSchema);

// Generate random amount of points
export const getRewardPoints = (min?: number, max?: number) => {
    min = Math.ceil(min ?? 5)
    max = Math.floor(max ?? 10);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const createEconData = async (userID: string, initalPoint?: number) => {
    await econModel.create({
        _id: userID,
        points: initalPoint ?? getRewardPoints(),
        lastGrantedPoint: new Date(),
    })
}
type grantPointsOption = {
    points?: number;
    ignoreCooldown?: boolean;
    noNewEntry?: boolean;
}
export const grantPoints = async (userID: string, options?: grantPointsOption) => {
    if(!options) options = {};
    if(!options.points) options.points = getRewardPoints();
    if(!options.ignoreCooldown) {
        const userEconData = await econModel.findOne({_id: userID});
        if(!userEconData) {
            if(!options.noNewEntry) {
                createEconData(userID, options.points);
                return true;
            }
            return false;
        }
        // 1 minute cooldown
        if(userEconData.lastGrantedPoint.getTime() > (new Date()).getTime() - 60000) return false;
    }
    const updateRes = await econModel.updateOne({_id: userID}, {
        $set: {
            lastGrantedPoint: new Date()
        },
        $inc: {
            points: options.points
        }
    })
    // User exist and points are granted
    if(updateRes.matchedCount > 0) return true;
    // User doesn't exist. Return true if the user is automatically created with inital points.
    if(!options.noNewEntry) {
        createEconData(userID, options.points);
        return true;
    }
    return false;
}

// Why did I even create this if I won't even use it -_-
export class EconomyManager {
    private user: User;
    constructor(member: User | GuildMember) {
        this.user = member instanceof GuildMember ? member.user : member;
    }
    public async addPoint(amount: number) {
        if(!isConnected()) return false;
        const response = await econModel.updateOne({_id: this.user.id}, {$inc: {points: amount}})
        if(response.matchedCount == 0) return await this._createEntry(amount);
        return (response.matchedCount == response.modifiedCount);
    }
    public async removePoint(amount: number, noNegative = true) {
        if(!isConnected()) return false;
        if(noNegative && (await this.getPoint())! - amount < 0) return false;
        const response = await econModel.updateOne({_id: this.user.id}, {$inc: {points: -amount}})
        if(response.matchedCount == 0) return await this._createEntry(-amount);
        return response.matchedCount == response.modifiedCount;
    }
    public async setPoint(amount: number) {
        if(!isConnected()) return false;
        const response = await econModel.updateOne({_id: this.user.id}, {$set: {points: amount}})
        if(response.matchedCount == 0) return await this._createEntry(amount);
        return response.matchedCount == response.modifiedCount;
    }
    public async getPoint() {
        if(!isConnected()) return;
        const response = await econModel.findOne({_id: this.user.id})
        if(response) return response.points;
        await this._createEntry();
        return 0;
    }
    private async _createEntry(initalPoint?: number) {
        const newEntry : econType = {
            _id: this.user.id,
            points: initalPoint ?? 0,
            lastGrantedPoint: new Date()
        }
        const response = await econModel.create(newEntry);
        return response._id == this.user.id;
    }
}
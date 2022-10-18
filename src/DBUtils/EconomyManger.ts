import { GuildMember, User } from 'discord.js';
import Mongoose from 'mongoose';
import { isConnected } from '../utils/DatabaseManager';

type econType = {
    _id: string;
    username: string;
    points: number;
    lastGrantedPoint: Date;
}

const econSchema = new Mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    username: {
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

export class EconomyManager {
    private user: User;
    constructor(member: User | GuildMember) {
        this.user = member instanceof GuildMember ? member.user : member;
    }
    public async addPoint(amount: number) {
        if(!isConnected()) return false;
        const response = await econModel.updateOne({_id: this.user.id}, {$set: {username: this.user.tag}, $inc: {points: amount}})
        if(response.matchedCount == 0) return await this._createEntry(amount);
        return (response.matchedCount == response.modifiedCount);
    }
    public async removePoint(amount: number, noNegative = true) {
        if(!isConnected()) return false;
        if(noNegative && (await this.getPoint())! - amount < 0) return false;
        const response = await econModel.updateOne({_id: this.user.id}, {$set: {username: this.user.tag}, $inc: {points: -amount}})
        if(response.matchedCount == 0) return await this._createEntry(-amount);
        return response.matchedCount == response.modifiedCount;
    }
    public async setPoint(amount: number) {
        if(!isConnected()) return false;
        const response = await econModel.updateOne({_id: this.user.id}, {$set: {username: this.user.tag, points: amount}})
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
            username: this.user.tag,
            points: initalPoint ?? 0,
            lastGrantedPoint: new Date()
        }
        const response = await econModel.create(newEntry);
        return response._id == this.user.id;
    }
}
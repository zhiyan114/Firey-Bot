import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { captureException } from '@sentry/node';
import { prisma } from '../utils/DatabaseManager';

// Generate random amount of points
export const getRewardPoints = (min?: number, max?: number) => {
    min = Math.ceil(min ?? 5)
    max = Math.floor(max ?? 10);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const createEconData = async (userID: string, initalPoint?: number) => {
    if(!prisma) return;
    try {
        await prisma.economy.create({
            data: {
                memberid: userID,
                points: initalPoint,
                lastgrantedpoint: new Date(),
            }
        })
    } catch(ex) {
        // user is probably not registered to the database by userJoinHandler yet
        if(ex instanceof PrismaClientKnownRequestError && ex.code == "P2003") return;
        captureException(ex);
    }
}
type grantPointsOption = {
    points?: number;
    ignoreCooldown?: boolean;
    noNewEntry?: boolean;
}
export const grantPoints = async (userID: string, options?: grantPointsOption) => {
    if(!prisma) return false;
    if(!options) options = {};
    if(!options.points) options.points = getRewardPoints();
    // Find the member first
    const econData = await prisma.economy.findUnique({
        where: {
            memberid: userID
        }
    })
    if(!econData) {
        if(options.noNewEntry) return false;
        await createEconData(userID, options.points);
        return true;
    }
    if(!options.ignoreCooldown && econData.lastgrantedpoint.getTime() > (new Date()).getTime() - 60000) return false; // 1 minute cooldown
    await prisma.economy.update({
        data: {
            lastgrantedpoint: new Date(),
            points: {increment: options.points}
        },
        where: {
            memberid: userID
        }
    })
    // User exist and points are granted
    return true;
}
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { captureException } from '@sentry/node';
import { prisma } from '../utils/DatabaseManager';

// Generate random amount of points
export const getRewardPoints = (min?: number, max?: number) => {
    min = Math.ceil(min ?? 5)
    max = Math.floor(max ?? 10);
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
    const econData = await prisma.members.findUnique({
        where: {
            id: userID
        }
    })
    if(!econData) return false;
    if(!options.ignoreCooldown && econData.lastgrantedpoint.getTime() > (new Date()).getTime() - 60000) return false; // 1 minute cooldown
    await prisma.members.update({
        data: {
            lastgrantedpoint: new Date(),
            points: {increment: options.points}
        },
        where: {
            id: userID
        }
    })
    // User exist and points are granted
    return true;
}
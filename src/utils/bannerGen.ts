/*
 * Name: bannerGen.ts
 * Desc: Internal Library to generate user welcome banner
 * Author: zhiyan114
 */

import { Canvas, createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import https from 'https';
import sharp from 'sharp';
/**
 * Generate a welcome banner for new users joined to the server
 */
export class BannerPic {
    private canvas: Canvas;
    constructor() {
        this.canvas = createCanvas(800, 400)
    }
    /**
    * Generate the banner
    * @param name The user's display tag
    * @param imgURL The user's avatar URL
    * @returns The Buffer of the image in PNG format
    */
    public async generate(name: string, imgURL: string) {
        const context = this.canvas.getContext('2d')
        this.setBackground(context);
        this.setText(context, name)
        await this.setProfilePicture(context, imgURL);
        return this.canvas.toBuffer("image/png")
    }
    /**
    * Set the canvas's background
    * @param ctx The canvas context
    */
    private setBackground(ctx: CanvasRenderingContext2D) {
        let gradient = ctx.createLinearGradient(this.canvas.width, 0, 0, this.canvas.height);
        gradient.addColorStop(0, "#16d2df");
        gradient.addColorStop(1, "#f610ff");
        ctx.fillStyle = gradient;
        ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    }
    /**
    * Set the canvas's user profile picture
    * @param ctx The canvas context
    * @param url The user's avatar URL
    */
    private async setProfilePicture(ctx: CanvasRenderingContext2D, url: string) {
        const radius = 60;
        // Draw the circular path
        ctx.beginPath()
        ctx.arc(this.canvas.width/2, this.canvas.height/3, radius, 0, 2*Math.PI, true);
        ctx.closePath();
        ctx.clip();
        // Calculate position data
        const pfp = await loadImage(await this.urltobuff(url));
        const aspect = pfp.height / pfp.width;
        const hsx = radius*Math.max(1.0/aspect, 1);
        const hsy = radius*Math.min(aspect, 1.0);
        // Draw in the profile picture
        ctx.drawImage(pfp, this.canvas.width/2 - hsx,this.canvas.height/3 -hsy, hsx*2, hsy*2);
    }
    /**
    * Set the canvas's text
    * @param ctx The canvas context
    * @param name The user's display tag
    */
    private setText(ctx: CanvasRenderingContext2D, name: string) {
        ctx.font = "30px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 10;
        ctx.fillText(name, this.canvas.width/2, this.canvas.height/3 + 110);
        ctx.font = "22px sans-serif, segoe-ui-emoji";
        ctx.fillText("Welcome to Firey's server! I hope you enjoy your stay here (σ`・∀・)σ", this.canvas.width/2, this.canvas.height/3 + 150);
    }
    /**
    * Download an image from a URL and convert it to a Buffer in PNG format
    * @param url The URL of the image
    * @returns The Buffer of the image in PNG format
    */
    private async urltobuff(url: string) {
        return new Promise<Buffer>(async(res,rej)=>{
            https.get(url, async(resp)=>{
                const data: Buffer[] = []
                resp.on('data', (chunk)=>{
                    data.push(chunk);
                })
                resp.on('end',async ()=>{
                    // Conversion is necessary since discord uses webp as their default format which Node-Canvas doesn't support
                    res(await sharp(Buffer.concat(data)).toFormat('png').toBuffer())
                })
                resp.on('error',(err)=>rej(err));
            })
        })
    }
}
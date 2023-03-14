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
        this.canvas = createCanvas(900, 400)
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
        this.setText(context, name);
        this.setBorder(context);
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
    * Set a rainbow border around the canvas
    * @param ctx The canvas context
    */
    private setBorder(ctx: CanvasRenderingContext2D) {
        const gradient = ctx.createLinearGradient(0, this.canvas.height, this.canvas.width, 0);
        gradient.addColorStop(0, "red");
        gradient.addColorStop(0.15, "orange");
        gradient.addColorStop(0.33, "yellow");
        gradient.addColorStop(0.5, "green");
        gradient.addColorStop(0.67, "blue");
        gradient.addColorStop(0.85, "indigo");
        gradient.addColorStop(1, "violet");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 10;
        ctx.strokeRect(0,0,this.canvas.width,this.canvas.height);
    }
    /**
    * Set the canvas's text
    * @param ctx The canvas context
    * @param name The user's display tag
    */
     private setText(ctx: CanvasRenderingContext2D, name: string) {
        // Use fonts-noto on linux system and sans-serif on windows for character display compatibility
        ctx.font = "30px fonts-noto, sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 10;
        ctx.fillText(name, this.canvas.width/2, this.canvas.height/3 + 110);
        ctx.font = "22px fonts-noto, sans-serif, segoe-ui-emoji";
        ctx.fillText("Welcome to Firey's server! I hope you enjoy your stay here (σ`・∀・)σ", this.canvas.width/2, this.canvas.height/3 + 150);
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
        ctx.lineWidth = 10;
        ctx.strokeStyle = "white";
        ctx.stroke();
        ctx.clip();
        // Calculate position data
        const pfp = await loadImage(await this.urltobuff(url));
        const aspect = pfp.height / pfp.width;
        const hsx = radius*Math.max(1.0/aspect, 1);
        const hsy = radius*Math.min(aspect, 1.0);
        // Fill in the background (so pfp doesn't look like it's colliding with the border)
        ctx.fillStyle = "black";
        ctx.fillRect(this.canvas.width/2 - hsx,this.canvas.height/3 - hsy, hsx*2, hsy*2);
        // Draw in the profile picture
        ctx.drawImage(pfp, this.canvas.width/2 - hsx,this.canvas.height/3 - hsy, hsx*2, hsy*2);
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
                resp.on('data',(chunk)=> data.push(chunk))
                // Conversion is necessary since discord uses webp as their default format which Node-Canvas doesn't support
                resp.on('end',async()=> res(await sharp(Buffer.concat(data)).toFormat('png').toBuffer()))
                resp.on('error',(err)=> rej(err));
            })
        })
    }
}
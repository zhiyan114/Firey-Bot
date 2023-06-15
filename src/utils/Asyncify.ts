/*
* This util converts all callback functions to async functions
*/
import { FfprobeData, ffprobe } from "fluent-ffmpeg";
import https from "https";
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";

// Save the user file to a disk for ffprobe to process
export const saveToDisk = (url: string, fileName?: string): Promise<string> => {
  return new Promise<string>(async(res,rej)=>{
    https.get(url, async(resp)=>{
      const fName = fileName ?? randomUUID();
      const fStream = createWriteStream(fName);
      resp.pipe(fStream);
      fStream.on("finish",()=> res(fName));
      fStream.on("error",(err)=> rej(err));
      resp.on("error",(err)=> rej(err));
    });
  });
};
// Make ffprobe async function
export const ffProbeAsync = (file: string) => new Promise<FfprobeData>(async(res,rej)=>
  ffprobe(file,(err,data)=>{
    if(err) return rej(err);
    res(data);
  })
);

export const sleep = (ms: number) => new Promise<void>((res)=>setTimeout(res,ms));
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import dotenv from 'dotenv';
dotenv.config();

export default new NeynarAPIClient(process.env.NEYNAR_API_KEY ?? "");

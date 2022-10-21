import axois from 'axios';
import querystring from 'querystring'
import { clientID } from '../config';

type AccessToken = {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export const getAccessToken = async (refreshToken: string) => {
    const serverResponse = await axois.post<AccessToken>("https://discord.com/api/v10/oauth2/token", querystring.stringify({
        "client_id": clientID,
        "client_secret": process.env['CLIENTSECRET'],
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
    }),{
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })
    return serverResponse.data.access_token;
}
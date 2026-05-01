const DEV_API_BASE_URL = "http://192.168.1.37:3000";
const PROD_API_BASE_URL = "https://rank-lakshyam.vercel.app";

export const API_BASE_URL = __DEV__ ? DEV_API_BASE_URL : PROD_API_BASE_URL;

// Google OAuth - replace with your actual web client ID
export const GOOGLE_WEB_CLIENT_ID = "755775791815-asilf0r89jvqkhnmchgptps6qvaa2hk8.apps.googleusercontent.com";

import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config()

export default async function connectToDb () {
    const uri = process.env.NODE_ENV === 'production'
      ? process.env.MONGO_URI_PROD || process.env.MONGO_URI
      : process.env.MONGO_URI || process.env.MONGO_URI_PROD;

    if (!uri) {
      console.error('No MongoDB connection string provided. Set MONGO_URI or MONGO_URI_PROD.');
      throw new Error('MongoDB connection string not configured');
    }

    try {
        await mongoose.connect(uri)
        console.log('connected successfully')
    } catch (e) {
        console.error('Failed to connect to MongoDB:', e)
        throw e;
    }
}
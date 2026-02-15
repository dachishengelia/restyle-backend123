import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config()

export default async function connectToDb () {
    try{
        await mongoose.connect(process.env.MONGO_URI_PROD)
        console.log('connected successfully')
    }catch(e){
        console.log("ver daukavshirda mongodbs", e) // Show error details
    }
}
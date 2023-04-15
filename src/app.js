import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from 'dayjs';
import joi from "joi";

const server = express();

server.use(cors());
server.use(express.json());
dotenv.config();

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);

mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((err) => console.log(err.message));

server.post("/participants", async (req, res) => {
    try{
        const { name } = req.body;

        console.log(name);

        const nameSchema = joi.object({
            name: joi.string().required()
        })

        const validate = nameSchema.validate({ name: name })
        if (validate.error) return res.sendStatus(422)

        const user = await db.collection("participants").findOne({ name: name });
        if (user) return res.sendStatus(409);

        const newUser = {
            name: name,
            lastStatus: Date.now()
        }

        await db.collection("participants").insertOne(newUser);

        const now  = dayjs().format("HH:mm:ss");
        const newMessage = { 
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: now
        };

        await db.collection("messages").insertOne(newMessage);

        return res.sendStatus(201);
    }catch(err){
        console.log(err);
        res.sendStatus(500);
    }

});

server.get('/participants', async (req, res) => {
    try {
        let participants = [];
        participants = await db.collection('participants').find().toArray();
        res.send(participants);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

server.get('/messages', async (req, res) => {
    try {
        const { user } = req.headers;
        const limit = Number(req.query.limit);
        console.log(limit);
        if(limit <= 0 || isNaN(limit)){
            return res.sendStatus(422);
        }

        let messages = [];
        messages = await db.collection('messages').find({$or: [ { $or: [ { to: user }, { from: user }] }, { $or: [ { to: "Todos" }, { from: "Todos" }] }]}).toArray();

        if(limit){
            const tamanho = messages.length;
            if(limit < tamanho){
                return res.send(messages.slice(tamanho-limit));
            }
        }
        res.send(messages);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

server.listen(5000);
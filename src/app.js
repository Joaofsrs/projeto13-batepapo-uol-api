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
    try {
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

        const now = dayjs().format("HH:mm:ss");
        const newMessage = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: now
        };

        await db.collection("messages").insertOne(newMessage);

        return res.sendStatus(201);
    } catch (err) {
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

server.post('/messages', async (req, res) => {
    try {
        const { to, text, type } = req.body;
        const { from } = req.headers;
        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().required().valid("message").valid("private_message"),
        })
        const validate = messageSchema.validate(req.body);
        if (validate.error) return res.sendStatus(422);
        const validateFrom = await db.collection("participants").findOne({ name: from });
        if (!validateFrom) {
            return res.sendStatus(422);
        }

        const now = dayjs().format("HH:mm:ss");

        const newMessage = {
            from: from,
            to: to,
            text: text,
            type: type,
            time: now
        };

        await db.collection("messages").insertOne(newMessage);

        return res.sendStatus(201);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }

});

server.get('/messages', async (req, res) => {
    try {
        const { user } = req.headers;
        const limit = req.query.limit;
        if ((Number(limit) <= 0 || isNaN(limit)) && limit !== undefined) {
            return res.sendStatus(422);
        }
        let messages = [];
        messages = await db.collection('messages').find({ $or: [{ $or: [{ to: user }, { from: user }] }, { $or: [{ to: "Todos" }, { from: "Todos" }] }] }).toArray();

        if (Number(limit)) {
            const tamanho = messages.length;
            if (Number(limit) < tamanho) {
                return res.send(messages.slice(tamanho - Number(limit)));
            }
        }
        res.status(201).send(messages);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

server.listen(5000);
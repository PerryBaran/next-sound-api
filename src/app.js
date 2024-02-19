const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const userRouter = require('./routes/user');
const albumRouter = require('./routes/album');
const songRouter = require('./routes/song');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: ['https://localhost:3000', 'http://localhost:3000'],
    exposedHeaders: ['set-cookie'],
  })
);

app.use('/users', userRouter);
app.use('/albums', albumRouter);
app.use('/songs', songRouter);

module.exports = app;

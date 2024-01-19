const express = require('express');
const userRouter = require('./routes/user');
const albumRouter = require('./routes/album');
const songRouter = require('./routes/song');

const app = express();

app.use(express.json());

app.use('/users', userRouter);
app.use('/albums', albumRouter);
app.use('/songs', songRouter);

module.exports = app;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = process.env;

const axios = require('axios');
const Sentry = require('@sentry/node');

module.exports = {
    register: async (req, res, next) => {
        try {
            let { name, email, password, password_confirmation } = req.body;
            if (password != password_confirmation) {
                return res.status(400).json({
                    status: false,
                    message: 'Bad Request',
                    err: 'please ensure that the password and password confirmation match!',
                    data: null
                });
            }

            let userExist = await prisma.user.findUnique({ where: { email } });
            if (userExist) {
                return res.status(400).json({
                    status: false,
                    message: 'Bad Request',
                    err: 'user has already been used!',
                    data: null
                });
            }

            let encryptedPassword = await bcrypt.hash(password, 10);
            let user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: encryptedPassword
                }
            });

            return res.status(201).json({
                status: true,
                message: 'Created',
                err: null,
                data: { user }
            });
        } catch (err) {
            next(err);
        }
    },

    login: async (req, res, next) => {
        try {
            let { email, password } = req.body;

            let user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: 'Bad Request',
                    err: 'invalid email or password!',
                    data: null
                });
            }

            let isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({
                    status: false,
                    message: 'Bad Request',
                    err: 'invalid email or password!',
                    data: null
                });
            }

            let token = jwt.sign({ id: user.id }, JWT_SECRET_KEY);

            return res.status(200).json({
                status: true,
                message: 'OK',
                err: null,
                data: { user, token }
            });
        } catch (err) {
            next(err);

        }
    },

    whoami: async (req, res, next) => {
        try {
            let { postId } = req.query;
            axios
                .get(`https://jsonplaceholder.typicode.com/posts/${postId}`)
                .then(({ data }) => {
                    return res.status(200).json({
                        status: true,
                        message: 'OK',
                        err: null,
                        data: { user: req.user, data }
                    });
                })
                .catch(err => {
                    Sentry.captureException(err);
                    return res.status(400).json({
                        status: false,
                        message: 'not found',
                        err: err.message,
                        data: null
                    });
                });
        } catch (err) {
            next(err);
        }
    }
};
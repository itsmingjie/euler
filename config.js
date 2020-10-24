require('dotenv').config()

module.exports = {
  port: process.env.PORT || 3001,
  redis: process.env.REDIS_URL,
  euler_token: process.env.EULER_TOKEN
}
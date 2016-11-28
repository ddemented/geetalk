'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

const token = process.env.FB_PAGE_ACCESS_TOKEN

var watson = require('watson-developer-cloud');

var conversation = watson.conversation({
  username: process.env.WATSON_USERNAME,
  password: process.env.WATSON_PASSWORD ,
  version: 'v1',
  version_date: '2016-09-20'
})

 

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {

    res.send("working")

})

// for Facebook verification and basic setup
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'yolo') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

var context = {};  

//For a api endpoint
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            


            conversation.message({
                workspace_id: process.env.WATSON_WORKSPACE_ID ,
                input: {'text': text },
                context: context
            },  function(err, response) {
                if (err)
                 console.log('error:', err);
                else
                {
                    response.output.text.forEach(function(text) { sendTextMessage(sender, text) }) 
                    context = response.context;
                    context.dialog_turn_counter += 1
                    context.dialog_request_counter += 1
                    //console.log('sent')
                }
            })

            
        }
    }
    res.sendStatus(200)
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

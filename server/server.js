const {WebSocketServer} = require ('ws')
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// Spinning the HTTP server and the WebSocket server.
const server = http.createServer();
// so wsServer is the 
const wsServer = new WebSocketServer({ server });
const port = 8000;

const state = {player1:{}, player2:{}};


wsServer.on ('connection', function (connection) {
    // give an id to the connection
    console.log("Connection established")
    const userId = uuidv4()
    connection.id = userId

    invitePlayer(connection)
    // trying to sort out how to send to the 'other player' by picking their id from clients
    // or maybe attaching their connection to the state object

    // console.log(wsServer.clients.forEach((client) => console.log(client.id)))

    // message received
    connection.on('message', function (message, userId) {
        const data = JSON.parse(message)
        console.log("message: ", data)

        // manage adding players    
        if (data.newPlayer) {
            addPlayer (connection, data)
        }

        // manage decision
        if (data.decision) {
            manageDecision (connection, data)
            // check both players have decided
            if (state.player1.decision && state.player2.decision) {
                calculateOutcome()
                sendOutcomes()
            } else {
                console.log("No decision yet")
            }
        }

        // check for reset button
        if (data.message === "restart") {
            console.log("Restart")
            resetPlayers()
        }


    })    

})


function resetPlayers () {
    state.player1 = {}
    state.player2 = {}
    console.log(state)
      wsServer.clients.forEach ((client) => {
        client.send(JSON.stringify({restart: true}))
        console.log(client.id)
    })}

function invitePlayer (connection) {
    const space = (!state.player1.name || !state.player2.name) ? true : false
    const spaceForPlayers = {space: space}
    console.log("spaceForPlayers: ", spaceForPlayers.space)
    connection.send(JSON.stringify({spaceForPlayers: spaceForPlayers}))
}


function addPlayer (connection, data) {

        // check if message is a player name
        if (state.player1.id && state.player2.id) {
            connection.send (JSON.stringify({status: "no space", message: "Sorry but there are already two players. Stay on to see their decisions!"}))
        } else if (!state.player1.id) {
            console.log("New player one!")
            state.player1.name = data.newPlayer
            state.player1.id = connection.id
            state.player1.connection = connection
            const playerStatus = {
                status: "joined", 
                message: 
                    {player1: state.player1.name, 
                    player2: state.player2.name || "No Player 2 yet"}
                }
            //what if there is no connection for player2?

            state.player1.connection.send(JSON.stringify(playerStatus))
            if (state.player2.connection) {
            state.player2.connection.send(JSON.stringify(playerStatus))
            }

            // otherPlayer.send(JSON.stringify({status: "joined", message:data.newPlayer + " is player 1"}))
        } else if (!state.player2.id) {
            console.log("New player two!")
            state.player2.name = data.newPlayer
            state.player2.id = connection.id;
            state.player2.connection = connection;
            const playerStatus = {
                status: "joined", 
                message: 
                    {player2: state.player2.name, 
                    player1: state.player1.name || "No Player 1 yet"}
                }
                // aha - send no player 2 yet to EVERYONE
                // and also break down what is received with status
                // refactor all this to work with whatever is sent from server
            state.player1.connection.send(JSON.stringify(playerStatus))
            state.player2.connection.send(JSON.stringify(playerStatus))
        }

}

function manageDecision (connection, data) {
    // check decision 
    if (connection.id == state.player1.id && !state.player1.decision) {
        state.player1.decision = data.decision
        console.log(state)
        sendDecisionSpectators(state.player1)
    }
    else if (connection.id == state.player2.id && !state.player2.decision) {
        state.player2.decision = data.decision
        sendDecisionSpectators(state.player2)
    }
    
    // send the decision to spectators but not to other player + "waiting for the other prisoner's response"

    console.log("decisions: ", state.player1.decision, state.player2.decision)
}

function calculateOutcome () {

    console.log("Checking outcomes")

    // choose outcome from two decisions
    if (state.player1.decision == "schtum" && state.player2.decision == "schtum") {
        state.player1.outcome = "You get a one year stretch. You both kept schtum"
        state.player2.outcome = "You get a one year stretch. You both kept schtum"
    }
    else if (state.player1.decision == "schtum" && state.player2.decision == "snitch") {
        state.player2.outcome = "You get out with no jail time, you rat! Your mate kept schtum."
        state.player1.outcome = "You get a three year stretch for your silence. Your mate ratted you out."
    }
    else if (state.player1.decision == "snitch" && state.player2.decision == "schtum") {
        state.player1.outcome = "You get out with no jail time, you rat! Your mate kept schtum."
        state.player2.outcome = "You get a three year stretch for your silence. Your mate ratted you out."
    }
    else if (state.player1.decision == "snitch" && state.player2.decision == "snitch") {
        state.player1.outcome = "You get a two year stretch. You both ratted each other out!"
        state.player2.outcome = "You both ratted each other out! You both get two years"
    }

}


function sendDecisionSpectators (player) {
    wsServer.clients.forEach ((client) => {
        if (client.id !== state.player1.id  && client.id !== state.player2.id ) {
            client.send(JSON.stringify({decision: player.decision, name: player.name}))
        }
    })
} 

function sendOutcomes () {
    wsServer.clients.forEach ((client) => {
        if (client.id == state.player1.id) {
            client.send(JSON.stringify({outcome: state.player1.outcome}))
        } else if (client.id == state.player2.id) {
            client.send(JSON.stringify({outcome: state.player2.outcome}))
        } else {
            client.send(JSON.stringify({outcome: [`${state.player1.name}: ${state.player1.outcome}`, 
                `${state.player2.name}: ${state.player2.outcome}`]
            }))
        }
    })
}

server.listen(port, () => {
    console.log(`WebSocket server is running on port ${port}`);
  });
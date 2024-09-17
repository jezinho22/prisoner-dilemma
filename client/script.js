const form = document.querySelector('form')
const schtum = document.querySelector("#schtum")
const snitch = document.querySelector("#snitch")
const restart = document.querySelector("#restart")
const feed = document.querySelector(".feed")

form.addEventListener("submit", handleSubmit)
schtum.addEventListener("click", handleClick)
snitch.addEventListener("click", handleClick)
restart.addEventListener("click", handleRestart)

// hide buttons until joined game
form.style.display = "none"
schtum.style.display = "none"
snitch.style.display = "none"
// restart.style.display = "none"

const connection = new WebSocket("ws://localhost:8000");

connection.onopen = (event) => {
    console.log("WebSocket is open now.");
  };

connection.onmessage = (response) => {
    const message = JSON.parse(response.data)
    console.log("message received: ", message)
    // this is checking state which is sent
    if (message.spaceForPlayers) {
        console.log("player invitation received")
        showForm(message)
    }

    if (message.status) {
        showPlayerName(message)
    }

    if (message.decision) {
        showDecision(message)
    }

    if (message.outcome) {
        if (Array.isArray(message.outcome)) {
            addPara(
                `${message.outcome[0]} \n\n${message.outcome[1]}` ,
            "outcome")
        } else {addPara(message.outcome, "outcome")}
        restart.style.display = "block"
    }

    if (message.restart) {
        reset()
    }


}

function handleSubmit(event) {
    event.preventDefault()

    const data = new FormData(form);
    const formValues = Object.fromEntries(data);
    connection.send(JSON.stringify({newPlayer: formValues.player}))  
}

function handleClick (event){

    // check if player has already made a decision
    if (event.target.id == "schtum") {
        connection.send(JSON.stringify({decision:"schtum"}))
    } else if (event.target.id == "snitch") {
        connection.send(JSON.stringify({decision:"snitch"}))
    }
    addPara(`Your decision is: ${event.target.id}. Waiting for the other prisoner to decide.`, "decision")
    schtum.style.display = "none"   
    snitch.style.display = "none"   
    
}

function handleRestart (event) {
    console.log("restart")
    connection.send(JSON.stringify({message: "restart"}))
 /// what happens here for restart?
}

function reset () {
    console.log("reset received")
    feed.innerHTML = "";

    showForm({spaceForPlayers: {space:true}})

}

function showForm (message) {
    if (message.spaceForPlayers.space) {
        console.log("message.spaceForPlayers: ", message.spaceForPlayers)

        schtum.style.display = "none"   
        snitch.style.display = "none"  
        form.style.display = "block";
        feed.innerHTML = "";
        // restart.style.display = "none"

    } else {
        addPara("Prisoners already selected, but stay on to see the outcome", "playerName")
    }
}

function showPlayerName (message) {
    form.style.display = "none"
    console.log("playerName message: ", message)

    addPara(message.message, "playerName")

    if (message.status == "joined") {
        schtum.style.display = 'block'
        snitch.style.display = 'block'
    } else if (message.status == "no space") {
        addPara("Will they snitch or keep schtum?", "playerName")
    }
}

function showDecision (player) {
    addPara(`${player.name} decided to ${player.decision === 'schtum' ? "keep schtum" : "snitch"}`, "playerName")
}

function addPara (content, selector) {
    const para = document.createElement('div')
    para.textContent = content
    para.className = selector
    feed.append(para)
}

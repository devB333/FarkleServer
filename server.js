const express = require('express');// import express functionund
const {createServer} = require('http'); // deconstruct create server function from http module in Node.js
const {Server} = require('socket.io'); // deconstruct Server class from socket.io livrary

const app = express()// creates app object from express method
const httpServer = createServer(app)// pushes express app object as the event 'request' handler for http requests

// io here is the WebSocket server attatched to the http server instance, it is used for establishing connection and managing the sockets, emitting to everyone, and emission to a specifc socket room

const io = new Server(httpServer, {// gives the httpServer to the io Server object so it can list for when the http server makes an http 'upgrade request'
    cors:{
        origin:'*'
    }
})

let dieCounter = 0;

const rooms = new Map();

const INTERNAL_CANVAS_WIDTH = 500;
const INTERNAL_CANVAS_HEIGHT = 281; // 500 * 9/16 ≈ 281, matches 16:9

const DIE_SIZE = 70;

const minDieRangeX = 10;
const maxDieRangeX = INTERNAL_CANVAS_WIDTH - DIE_SIZE - 10;

const minDieRangeY = 10;
const maxDieRangeY = INTERNAL_CANVAS_HEIGHT - DIE_SIZE - 10;


let spots = generateValidSpots();// this genrates valid spots for the dice



// socket vars im using: socket.roomCode and socket.playerNumber
io.on('connection', (socket) => {// inside this method is where all calls and messages to and from a specifc socket are sent, that socket is the way to access that specifc player
    console.log('player connected:', socket.id);
    
    //TO DO: Add score to win attr to room and assign it when a new room is made
    //TO DO: Add Invalid Input handling when data is wrong
    socket.on('joinRoom', (data) =>// join room handles putting two players into a room, the client will emit 'joinRoom' along with a room code command
    {

        
        if(rooms.has(data.roomCode) && rooms.get(data.roomCode).playersInRoom.size <= 2)
        {
            rooms.get(data.roomCode).playersInRoom.set(socket.id, new Player(socket.id, data.name));// players in room is the nest HashMap inside the rooms object inside the HashMap
            socket.join(data.roomCode);// now they are in the same room so you can make an emssion to anyone but that socket in the same room by doing socket.to(socket.roomCode).emit();

            socket.roomCode = data.roomCode;// attatch room code to socket. This makes a custom var to be referenced anywhere now. So you can always get this sockets room code just by doing socket.roomCode anywhere in this lambda.
           
            socket.playerNumber = rooms.get(socket.roomCode).playersInRoom.size;// either one or two depending on what player it is
            rooms.get(socket.roomCode).playersInRoom.get(socket.id).playerNumber = socket.playerNumber;// update player num, maybe put this in a function so you dont have to write it twice
            moveToRoom();
        }
        else if(data.roomCode == ""){// means there is no room
            const roomCode = "1234";// this will be hashed to a unique string

            const newRoom = new Room();
            newRoom.playersInRoom.set(socket.id, new Player(socket.id, data.name));// add new player to players in room Map of room object
            rooms.set(roomCode, newRoom); // add newRoom to rooms HashMap
            
            socket.join(roomCode);
            socket.roomCode = roomCode; // assign new room code to socket

            socket.playerNumber = rooms.get(socket.roomCode).playersInRoom.size;// either one or two depending on what player it is
            rooms.get(socket.roomCode).playersInRoom.get(socket.id).playerNumber = socket.playerNumber;// update player num

            console.log(rooms.get(socket.roomCode).playersInRoom.get(socket.id).name);
            console.log(socket.roomCode);

            moveToRoom();
        }
        else
        {
          if(rooms.has(data.roomCode) && rooms.get(data.roomCode).playersInRoom.size >= 2)
          {
             // TO DO: tell client lobby is full
          }

        }

        
        
        function moveToRoom()
        {
          console.log('moveToRoom');
          socket.emit('moveToRoom');
        }


        console.log(rooms.get(socket.roomCode).playersInRoom);

        
    })

    socket.on('disconnect', ()=>{
        console.log('player disconnected', socket.id);
    });

    socket.on('getRoomInfo', ()=>{
      const players = rooms.get(socket.roomCode).playersInRoom;

      const playerNames = [];
      players.forEach((p,key)=>
        {
          playerNames.push(p.name);// add the emit and finish functionality
      });

      const data = {
        playerNames: playerNames,
        roomCode: socket.roomCode
      };
      io.to(socket.roomCode).emit('roomInfo', data);// when another player joins the room this will rerun
    });

    //---------------------------------------------------------------------------- Below Game Functions, Above Room/Lobby Functions


    socket.on('gameStart',()=>{
      socket.emit('setPlayerNum', socket.playerNumber);// sets playerNumber client side
      const obj = {dice: rooms.get(socket.roomCode).dice, pendingScore: 0, hasRolled: true, hasBusted: rooms.get(socket.roomCode).hasBusted, playersRound: rooms.get(socket.roomCode).playersRound};
      io.to(socket.roomCode).emit("newDice", obj);

      console.log(socket.id + "now in room: " + socket.roomCode);
        console.log(rooms.get(socket.roomCode).playersInRoom);
        console.log("PlayerNumber is: " +  socket.playerNumber + "and playerNumber is: " + rooms.get(roomCode).playersInRoom.get(socket.id).playerNumber);
    });
    socket.on('bankButtonPressedClient', (state) =>{// handles syncing bank button presses animation
        socket.to(socket.roomCode).emit('bankButtonPressedServer', state)
    });// end bankButtonPressedClient
    
    socket.on('selectDiceSync', (data)=>{// the data here is the newDiceArr and pendingScore to update the selected die selection
      rooms.get(socket.roomCode).dice = data.dice; // update the dice on the server so when they get banked we don't need to pass the dice again.
      rooms.get(socket.roomCode).pendingScore = data.pendingScore;// update pending score

      const room = rooms.get(socket.roomCode);


      const objForNewDice = {
        dice: room.dice,
        pendingScore: room.pendingScore,
        hasRolled: room.hasRolled,
        hasBusted: room.hasBusted,
        playersRound: room.playersRound
      }

      socket.to(socket.roomCode).emit('newDice', objForNewDice);
    });// end selectDieSync handler


    socket.on('handleBanking', ()=> {
      const room = rooms.get(socket.roomCode);
      const currDice = room.dice;
      const currBankedDice = room.bankedDice;
      

      const returnedVals = handleBanking(currDice, currBankedDice);

      room.dice = returnedVals.dice;
      room.bankedDice = returnedVals.bankedDice;
      room.roundScore += returnedVals.roundScoreAdd;
      room.pendingScore = 0;
      room.hasRolled = false;

      const objForNewDice = {
        dice: room.dice,
        pendingScore: room.pendingScore,
        hasRolled: room.hasRolled,
        hasBusted: room.hasBusted,
        playersRound: room.playersRound
      }

      const objForBankedDice = {
        bankedDice: room.bankedDice,
        roundScore: room.roundScore,
      }

      io.to(socket.roomCode).emit('newDice', objForNewDice);
      io.to(socket.roomCode).emit('returnHandleBanking', objForBankedDice);

    });// end handle banking handler

    socket.on('reRollDice', (isNewRound)=>{
      const room = rooms.get(socket.roomCode);
      let newDice = [];

      room.hasRolled = true;// this prevents them from rolling again, because the request is coming from a new round, or a standard roll

      if((room.dice.length == 0) || (isNewRound))
      {
        newDice = reRollDice(6);
        room.bankedDice = [];

          

          if(isNewRound)
        {
          io.to(socket.roomCode).emit('newRoundStart'); // used to set isNewRound to false after the new round has started
          room.roundScore = 0;
        }

        const returnBankedDiceObj = {
          bankedDice: room.bankedDice,
          roundScore: room.roundScore
        }

        console.log(room.bankedDice);
        io.to(socket.roomCode).emit('returnHandleBanking',returnBankedDiceObj);
      }
      else
        newDice = reRollDice(room.dice.length);

      
        

      // need to handle busting logic here, call checkBust with newDice and make a bool const var to but in the return obj, then figure out whos turn it is next and display a clinet side bust popup "Start next turn..." that only the proper player can pick
      // then make another emission to that socket to start the next round, (reRollDice, and popUpGone)
      

      room.dice = newDice;
      //console.log(room.dice);

      const hasBusted = checkBust(room.dice, false);
      room.hasBusted = hasBusted;

      if(hasBusted)
      {
        
        if(room.playersRound == 1)
          room.playersRound = 2;// swap whos round it is
        else
          room.playersRound = 1;

        room.hasRolled = false;// prepare hasRolled for new player
      }

      const returnDiceObj = {
        dice: newDice,
        pendingScore: 0,
        hasRolled: room.hasRolled,
        hasBusted: room.hasBusted,
        playersRound: room.playersRound
      };


      

      io.to(socket.roomCode).emit('newDice', returnDiceObj);
      
    });// end reRollDice

    socket.on('endRoundBank', ()=>{// maybe also add the checkEndGameBoolHereToo
      const room = rooms.get(socket.roomCode);
      let returnPlayerScore = 0;// return socre is used so I dont have to write out the emission twice inside the if block
      
      



      if(socket.playerNumber == 1)
      {
        room.playerOneScore += room.roundScore;
        room.playersRound = 2;
      }
      else
      {
        room.playerTwoScore += room.roundScore;
        room.playersRound = 1;// swap whos round it is
      }


      console.log("Socket Player Num: " + socket.playerNumber + " PlayersRound: " + room.playersRound);
      

      
      room.pendingScore = 0; // reset pending score
      room.bankedDice = []; // empty bankedDice
      room.hasRolled = false;// prepare hasRolled for new player
      


      const diceRetrunObj = 
      {
        dice: room.dice,
        pendingScore: room.pendingScore,
        hasRolled: room.hasRolled,
        hasBusted: room.hasBusted,
        playersRound: room.playersRound
      };

      const endRoundReturnObj = {
        bankedDice: room.bankedDice,
        playerOneScore: room.playerOneScore,
        playerTwoScore: room.playerTwoScore,
        playerScoring: socket.playerNumber,
        playersRound: room.playersRound
      };

      io.to(socket.roomCode).emit('newDice', diceRetrunObj);// send new dice and pending score 0 back to genral purpose new Dice handler
      io.to(socket.roomCode).emit('endRoundBankResponse', endRoundReturnObj);// used to reset banked dice and update the return score for the respective player

      console.log("emissions ran")
      console.log(endRoundReturnObj);
      console.log("P1 Score: " + room.playerOneScore + "P2 Score: " + room.playerTwoScore);

      room.roundScore = 0;
    });// end onEndRoundBank
});// end socket on connect

httpServer.listen(3000, () => {
    console.log('server running on port 3000');
});

class Player{
    constructor(id, name)
    {
        this.id = id;
        this.playerNumber = 0;// this will either be 1 or 2, it is set right after the constructor call. 0 is a placeholder to check for invalid info
        this.name = name;
        console.log("player added");
    }

    updateScore(newScore)
    {
        this.score += newScore;
    }
}

// start player handling methods

class Room{

  
    constructor(){//TO DO: Handle Auto Randomize playersRound on constructor to decide who goes first

        this.playersInRoom = new Map()// socket.id is key
        
        this.playerOneScore = 0;
        this.playerTwoScore = 0;

        this.playersRound = 1;// keeps track of whose round it is
        
        this.hasRolled = true;

        this.dice = reRollDice(6);
        while(checkBust(this.dice) == true)
          this.dice = reRollDice(6);
        console.log(this.dice);
        this.bankedDice = []; 

        this.hasBusted = false; // used to track weather the curr player has busted
        
        this.roundScore = 0;// add to this after they bank the dice
        this.pendingScore = 0;// used to display the pending score ui after a player selects the dice
    }
}
// start handling dice -------------------------------------------------------------------------------------------------


// checks if dice are overlapping by taking the center of each die and using the pythgorean theorem to get distance between both 2D
  //Get the overlap ammount
  //nomralize the vector by dx by the distance
  // then use normalized x and y vectors to figure out how much to move the object
  function isOverlapping(dieA, dieB)
  {


    const dieFootprint = 90; // matches 18% of INTERNAL_CANVAS_WIDTH (500) — the die's internal size
    const collisionThreshold = dieFootprint * 0.9; // slightly less than full size, allows near-touching without triggering as "overlapping"
    const scaleY = INTERNAL_CANVAS_WIDTH / INTERNAL_CANVAS_HEIGHT; // ~1.78 for 16:9
    // diagonal is used in checkIfOverlapping
    // diagnoal runs off the assumption that the square is 100 by 100
    const diagonal = Math.sqrt(DIE_SIZE * DIE_SIZE + DIE_SIZE * DIE_SIZE);// the diagnoal of the square, or the max length if the square is roatated that we must account
    
    /*
    const dx = (dieA.x + 45) - (dieB.x + 45)// +50 calcualtes from the midpoints of the dice
    const dy = ((dieA.y + 45) - (dieB.y + 45))
    const dist = Math.sqrt(dx*dx + dy*dy) || 1
    */

    const size = DIE_SIZE;

    const dx = Math.abs((dieA.x + size / 2) - (dieB.x + size / 2));
    const dy = Math.abs((dieA.y + size / 2) - (dieB.y + size / 2));

    return  dx < size * 0.75 && dy < size * 0.75;// if overlapping will return true because dist between them is less thant the diamater of the square
      
  }

  // runs a descending for loop to  check if the genrated die is overlapping with any other previous genrated die.
  // the logic is that we do a bottom up building approach, so we make sure the first die is not overlapping with any dice
  // then the second, then third and so on, and by the end none will be overlapping
  // we nest a while loop inside the for loop so that we can make sure its not overlapping again, and then 
  // after that we restart the for loop and make it go through all the dice again to ensure it has not interfeared with any other dice as well.
  function overlapCheck(die, diceArr, index)
{// I abandoned this because it was really inefficent and took forever and somtimes ran forever too
  const maxAttempts = 1000;

  for(let attempt = 0; attempt < maxAttempts; attempt++)
  {
    let overlapping = false;

    for(let i = 0; i < index; i++)
    {
      if(isOverlapping(die, diceArr[i]))
      {
        overlapping = true;
        break;
      }
    }

    if(!overlapping)
    {
      return; // successfully placed
    }

    die.x = minDieRangeX + Math.random() * (maxDieRangeX - minDieRangeX);
    die.y = minDieRangeY + Math.random() * (maxDieRangeY - minDieRangeY);
  }

  console.log("Could not place die");
}

  function createDie(id, amp, diceArr)
  {
    

    const die = {
      id: id,
      value: Math.floor(Math.random()* 6) + 1,
      x: 0,//Math.max(minDieRangeX, Math.min(maxDieRangeX, minDieRangeX + Math.random() * (maxDieRangeX - minDieRangeX))),
      y: 0,//Math.max(minDieRangeY, Math.min(maxDieRangeY, minDieRangeY + Math.random() * (maxDieRangeY - minDieRangeY))),
      seed: Math.random(),
      rotation: Math.random() * 360,
      amp: amp,
      selected: false
    }
    return die;
  }

  function checkBust(diceToCheck)// returns true if busted
{
  if(calcDicePoints(diceToCheck) == 0)
    return true;
  else
    return false;
}

//this function will genrate new dice to reroll
  function reRollDice(howManyToReroll)
  {
      
      const newDice = [];

            // randomize order
      spots = shuffle(spots);// shuffle the spots to randmomize the order

     

      for(let i = 0; i < howManyToReroll; i++)
      {
        //console.log(i);
        newDice.push(createDie(dieCounter++, ((Math.random() * 6) + 1), newDice));
        //overlapCheck(newDice[i], newDice, i);
      }

       for(let i = 0; i < newDice.length; i++)
      {
          newDice[i].x = spots[i].x + (Math.random() * 20 - 10);// add a bit a jitter to the die spots
          newDice[i].y = spots[i].y + (Math.random() * 20 - 10);
      }
      return newDice;
    

  }

  // uses a nested for loop to make sure every spot genreated for dice is at least + spacing apart
 function generateValidSpots()
{
    const spots = [];

    const spacing = DIE_SIZE + 30;
    const edgeBuffer = 25;

    const startX = edgeBuffer + 20;// padding from left side
    const startY = edgeBuffer + 20;// padding from top

    const endX = INTERNAL_CANVAS_WIDTH - DIE_SIZE - 15;// padding from right
    const endY = INTERNAL_CANVAS_HEIGHT - DIE_SIZE - 15;// padding from bottom

    for(let y = startY; y <= endY; y += spacing)
    {
        for(let x = startX; x <= endX; x += spacing)
        {
            spots.push({
                x,
                y
            });
        }
    }

    return spots;
}

function shuffle(array)
{
    for(let i = array.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

  function calcDicePoints(diceToCheck, selectedDiceCheck)// selectedDiceCheck is a bool variable (put true if you want to only check selected dice) that exists because if youre checking if all the dice have any valid points you don't care about keeping dice that don't contribute, but for acutal scoring you do. Basically to check for busts we need to check all the dice at once to see if theres any acceptable combo of dice, but using selceted dice it needs to be exactly what the player puts in
  {
      let score = 0;
      let diceCount = [0,0,0,0,0,0,0] // this will count how many of each dice are in the selected dice ammount
      diceToCheck.forEach((die)=> diceCount[die.value]++);

      const allDiceScore = diceCount.filter((die) => die !== 0);
      
      if((allDiceScore.length == 2) && (allDiceScore.every((c) => c === 3)))// 2 triplets
        return 2500;
      else if ((allDiceScore.length == 3) && (allDiceScore.every((c) => c === 2)))// three pair
        return 1500;
      else if ((allDiceScore.length == 2) && ((allDiceScore[0] === 4 && allDiceScore[1] === 2) || (allDiceScore[0] == 2 && allDiceScore[1] === 4)))// 4 of a kind & a pair
        return 1500;
      else if ((allDiceScore.length == 6) && (allDiceScore.every((c) => c === 1)))
        return 1500;
      
      

      for(let i = 1; i <= 6; i++)
      {
        if(diceCount[i] == 6)
        {
          score += 3000;
          diceCount[i] -= 6;
        }
        else if(diceCount[i] == 5)
        {
          score += 2000;
          diceCount[i] -= 5;
        }
        else if(diceCount[i] == 4)
        {
          if(i == 1)
            score += 2000;
          else 
            score += 1000;

          diceCount[i] -= 4;
        }
        else if(diceCount[i] == 3)
        {
          if(i == 1)
            score += 1000;
          else
            score += (i * 100);

          diceCount[i] -= 3;
        }
      }

      score += diceCount[1] * 100;
      score += diceCount[5] * 50;

      diceCount[1] = 0;
      diceCount[5] = 0;

      if(selectedDiceCheck)
      {
          if(diceCount.every((c) => c == 0))
            return score;
          else
            return 0;
      }
      else 
        return score;
      
  }

  
  function handleBanking(dice, bankedDice)// this function will take the current dice and current banked dice and return, new banked dice, new dice (after being rerolled) and the new roundScore to add (roundScore is the current score for that round total, before ending the round and cacheing the points)
  {
    const returnVals = {
      bankedDice: [],
      dice: [],
      roundScoreAdd: 0
    };
     let bankDiceAdd = dice.filter((currDie)=> currDie.selected == true);// currentlly selceted dice
     let newBankedDice = [...bankedDice];// all the dice that are currently banked

     returnVals.roundScoreAdd = calcDicePoints(bankDiceAdd, true); // calculate how much the selected dice are worth

      bankDiceAdd.forEach((die)=>{
        newBankedDice.push(die);
      });

      newBankedDice.sort((a,b) => a.value - b.value);

      //console.log(newBankedDice);
      returnVals.bankedDice = newBankedDice;
      
      // now we need to update the actual dice
      returnVals.dice = dice.filter((currDie) => currDie.selected == false);
      

      return returnVals;
  }


    // you might want to refactor this function because there are a lot of redundanices in terms of overlapping or code written twice because of the if statemnts
  function handleSelectDie(die) //next you need to handle valid point systems and pass both points and validity to handleBanking! There should be a scoreboard with pending points, and you should only be able to bank if
  {                             // you have valid points, in turn the bank button should also light up when you are able to bank.
    
       
  }
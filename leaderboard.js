// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".
Players = new Mongo.Collection("players");

// 'Snake' and 'Ladders' are collections to store snake and ladders information
Snakes = new Mongo.Collection("Snakes");
Ladders = new Mongo.Collection("Ladders");

var time_interval = 500
var var1, var2,var3,var4
var timeout_var = [var1,var2,var3,var4]

// function to generate score
// the player will move backwards when the score exceed 100
function calScore(prev_score) {
  var rolled_score = Math.floor(Math.random() * 6 + 1)
  var after_rolled_score = prev_score + rolled_score;
  if (after_rolled_score > 100){
    after_rolled_score = 200 - after_rolled_score
  }
  return [rolled_score,after_rolled_score]
}

// check if the player meets a snake
function checkSnakes(score){
  var snakelist = Snakes.find({});
  var set_score = score;
  snakelist.forEach(function(snake){
    if (score === snake.start){
      set_score = snake.land;
    }
  })
  return set_score
}


// check if player meets a ladder
function checkLadders(score){
  var ladderlist = Ladders.find({});
  var set_score = score;
  ladderlist.forEach(function(ladder){
    if (score === ladder.start){
      set_score = ladder.land
    }
  })
  return set_score
}

// check whether two players meet
// the player who comes late will go back to 0
function hasDuplicates(name,score){
  var playerlist = Players.find({});
  var flag = false;
  playerlist.forEach(function(player){
    if (score === player.score && name !== player.name){
      if (score !== 0){
        flag = true;
      }
    }
  })
  return flag
}

// calculate step for player
// the step size will be stored in database
function calStep(player_id){
  var log = ''
  var player = Players.findOne(player_id);
  var prev_score = player.score;
  log = log + player.name + ' started at ' + prev_score.toString()
  var rolled_score
  var after_rolled_score
  [rolled_score, after_rolled_score] = calScore(prev_score);
  log = log + ', rolled a ' + rolled_score.toString() + ', moved to ' + after_rolled_score.toString()
  after_snake_score = checkSnakes(after_rolled_score);
  if (after_snake_score !== after_rolled_score){
    log = log + ', met a snake, landed at ' + after_snake_score.toString()
  }
  after_ladder_score = checkLadders(after_snake_score);
  if (after_ladder_score !== after_snake_score){
    log = log + ', met a ladder, climbed to ' + after_ladder_score.toString()
  }
  if (hasDuplicates(player.name, after_ladder_score)){
    log = log + ', met another player, went back to 0'
    set_score = 0;
  }
  else{
    set_score = after_ladder_score
  }
  log = log + '\n'
  var prev_log = Session.get('log')
  var new_log = log + prev_log
  Session.set('log',new_log)

  var step_size = set_score - prev_score
  Players.update(player_id, {$set: {step: step_size}});
  return step_size;
}


//  find the next player
function findNext(player_id){
  player = Players.findOne(player_id);
  var next_player = Players.findOne({name: {$gt: player.name}}, {sort: {name: 1}});
  if (next_player){
    return next_player._id
  }
  else{
    return Players.findOne({}, { sort: { name: 1 } })._id;
  }
}

function calNextPlayerStep(){
  var current_player_id = Session.get("playerTurn");
  var next_player_id = findNext(current_player_id);
  Session.set("playerTurn", next_player_id);
  if (next_player_id !== Session.get("selectedPlayer")){
    var step_size = calStep(next_player_id);
    var set_score = step_size + Players.findOne(next_player_id).score
    Players.update(next_player_id, {$inc: {score: step_size}});

    if (set_score === 100){
      Session.set("end", "Game Ends")
      timeout_var.forEach(function(var_i){
        clearTimeout(var_i)
      })
    }

    return set_score
  }
  else{
    return false
  }
}


if (Meteor.isClient) {
  Session.set('log','')
  Template.restart.events({
    'click .restart_button': function() {
      //Players.update({}, {$set: {score: 0}}, {multi: true});
      var playerlist = Players.find({});
      playerlist.forEach(function (player) {
        Players.update(player._id,{$set: {score: 0}})
        Players.update(player._id,{$set: {step: 0}})
      });
      //Players.find().collection.update({}, {$set: {score: 0}}, {multi: true});
      Session.set("end",false);
      Session.set("selectedPlayer",false);
      Session.set("playerTurn",false);
      Session.set("rolled",false);
      Session.set("log",'')
    }
  });

  Template.leaderboard.helpers({
    players: function () {
      return Players.find({}, { sort: { name: 1 } });
    },
    selectedName: function () {
      var player = Players.findOne(Session.get("selectedPlayer"));
      return player && player.name;
    },
    turnName: function () {
      var player = Players.findOne(Session.get("playerTurn"));
      return player && player.name;
    },
    endedGame: function () {
      return Session.get("end");
    },
    isSelectedTurn: function(){
      if (Session.get("unrolled")){
        return true;
      }
      else{
        return false;
      }
    },
    isSelected: function(){
      if (Session.get("playerTurn") === Session.get("selectedPlayer")){
        return true;
      }
      else{
        return false;
      }
    },
    message: function(){
      var player = Players.findOne(Session.get("playerTurn"));
      return "moved " + player.step.toString() + " steps";
    },

    log: function(){
      var log = Session.get('log')
      return log
    }
  });

  Template.leaderboard.events({

    // when clicking the 'roll the dice' button
    'click .inc': function () {
      var my_player_id = Session.get("selectedPlayer");
      var my_player = Players.findOne(my_player_id);

      // calculate the stepsize and store it in databse
      step_size = calStep(my_player_id);
      Players.update(my_player_id, {$inc: {score: step_size}});
      Session.set("unrolled",false);
    },

    // when clicking the 'moves X steps' buttion
    'click .ok': function () {
      var player_id = Session.get("playerTurn");
      if (player_id === Session.get("selectedPlayer")){
        var player = Players.findOne(player_id);
        var set_score = player.score + player.step

        // when the score reaches 100, end the game
        if (set_score === 100){
          Session.set("end", "You Win!")
        }

        // else: pass the turn to next 3 players
        else{
          [0,1,2,3].forEach(function(i){
            timeout_var[i] = setTimeout(calNextPlayerStep,i * time_interval)
          })
          Session.set("unrolled",true)
        }
      }

    }
  });

  Template.player.helpers({
    turn: function () {
      return Session.equals("playerTurn", this._id) ? "turn" : '';
    }
  });

  Template.player.events({

    // clicking a player name = choose a role to play
    'click': function () {
      if (Session.get("selectedPlayer")){
      }
      else{

        Session.set("unrolled",true);
        Session.set("selectedPlayer", this._id);
        var playerlist = Players.find({}, { sort: { name: 1 } });
        var flag = true

        // calculate and add the stepsize for players before the chosen player
        playerlist.forEach(function(player){
          if (player._id === Session.get("selectedPlayer")){
            Session.set("playerTurn",player._id);
            flag = false;
          }
          if (flag){
            step_size = calStep(player._id);
            Players.update(player._id,{$inc: {score: step_size}});
          }
        }
      )}
    }
  })
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Players.find().count() !== 4) {
      Players.remove({});
      var names = ["Ada Lovelace", "Grace Hopper", "Marie Curie",
                   "Carl Friedrich Gauss"];
      _.each(names, function (name) {
        Players.insert({
          name: name,
          score: 0,
          step: 0
        });
      });
    };
    if (true) {
      Snakes.remove({});
      Snakes.insert({start:98,land:46});
      Snakes.insert({start:63,land:50});
      Snakes.insert({start:32,land:10});
    };

    if (true) {
      Ladders.remove({});
      Ladders.insert({start:28,land:48});
      Ladders.insert({start:56,land:80});
      Ladders.insert({start:67,land:92});
    }
  });
}

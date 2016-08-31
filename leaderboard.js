// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".
Players = new Mongo.Collection("players");

// 'Snake' and 'Ladders' are collections to store snake and ladders information
Snakes = new Mongo.Collection("Snakes");
Ladders = new Mongo.Collection("Ladders");

// function to generate score
// the player will move backwards when the score exceed 100
function calScore(prev_score) {
  var inc_score = Math.floor(Math.random() * 6 + 1)
  var set_score = prev_score + inc_score;
  if (set_score > 100){
    set_score = 200 - set_score
  }
  return set_score
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
function hasDuplicates(score){
  var playerlist = Players.find({});
  var flag = false;
  playerlist.forEach(function(player){
    if (score === player.score){
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
  var player = Players.findOne(player_id);
  var prev_score = player.score;
  var set_score = calScore(prev_score);
  set_score = checkSnakes(set_score);
  set_score = checkLadders(set_score);

  if (hasDuplicates(set_score)){
    set_score = 0;
  }

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


if (Meteor.isClient) {
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
      if (Session.get("playerTurn") === Session.get("selectedPlayer") && Session.get("unrolled")){
        return true;
      }
      else{
        return false;
      }
    },

    message: function(){
      var player = Players.findOne(Session.get("playerTurn"));
      return "moves " + player.step.toString() + " steps";
    }
  });

  Template.leaderboard.events({

    // when clicking the 'roll the dice' button
    'click .inc': function () {
      var my_player_id = Session.get("selectedPlayer");
      var my_player = Players.findOne(my_player_id);

      // calculate the stepsize and store it in databse
      calStep(my_player_id);
      Session.set("unrolled",false);
    },

    // when clicking the 'moves X steps' buttion
    'click .ok': function () {
      var player_id = Session.get("playerTurn");
      var player = Players.findOne(player_id);
      var set_score = player.score + player.step

      // when the score reaches 100, end the game
      if (set_score === 100){
        Players.update(player_id, {$set: {score: 100}});
        if (player_id === Session.get("selectedPlayer")){
          Session.set("end", "You Win!")
        }
        else{
          Session.set("end", "Game Over")
        }
      }

      // else: increase the score by step size
      else{
        Players.update(player_id, {$inc: {score: player.step}});
        var next_player_id = findNext(player_id);
        Session.set("playerTurn", next_player_id);

        // if next player is not the chosen player
        // calculate the stepsize and store it in database
        if (next_player_id !== Session.get("selectedPlayer")){
          calStep(next_player_id);
        }

        // if next player is the chosen player,
        // the player needs to roll the dice
        else{
          Session.set("unrolled",true);
        }
      }


    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals("playerTurn", this._id) ? "selected" : '';
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

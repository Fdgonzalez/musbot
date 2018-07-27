const Discord = require('discord.js');
const youtubedl = require('youtube-dl');
const auth = require('./auth.json');
const config = require('./config.json');
const ytdl = require('ytdl-core');
const search = require('youtube-search');

const client = new Discord.Client();

//Map connections to queues(arrays of links)
var queues = new Map();
const streamOptions = { seek: 0, volume: 1 };

client.on('ready', () => {
    console.log('Bot has started.');
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("message", async message => {
    if (!message.guild) return;
    if(message.author.bot) return;
    if(message.content.indexOf(config.prefix) !== 0) return;
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();    

    if(command === "play"){
        var connection = client.voiceConnections.get(message.guild.id);
        if(connection != null && connection.channel != message.member.voiceChannel){
            message.reply("The bot is already playing in another channel, please use that channel or " + config.prefix + "disconnect it first");
            return;
        }
        if (message.member.voiceChannel) {
            connection = await message.member.voiceChannel.join();
        } else {
            message.reply('You need to join a voice channel first!');
            return;
        }
        var song = args.join(" ");

        if(!song.startsWith("http://")){
            var opts = {
                maxResults: 1,
                key: auth.youtubeKey
            }; 
            search(song, opts, function(err, results) {
                if(err) return console.log(err);
                    console.log(results[0]);
                    message.reply("Enqueued " + results[0].title);
                    enqueue(connection,results[0].link);
                });  
        }else{
             console.log("DEBUG:Enqueued " + song);
             enqueue(connection,song);
        }
    }

    if(command === "skip"){
        var connection = client.voiceConnections.get(message.guild.id);
        message.reply("Skipped!");
        connection.dispatcher.end();
    }
    
    if(command === "pause"){
        var connection = client.voiceConnections.get(message.guild.id);
        connection.dispatcher.pause();
    }
    
    if(command === "resume"){
        var connection = client.voiceConnections.get(message.guild.id);
        connection.dispatcher.resume();
    }
    if(command === "clear"){
        var connection = client.voiceConnections.get(message.guild.id);
        message.reply("Cleared queue");
        while(queues.get(connection).pop);
    }
}
);

function enqueue(connection, link){
    if(queues.get(connection) == null)// If there is no queue for this guild create one
        queues.set(connection, new Array());
    queues.get(connection).unshift(link);
    
    if(connection.dispatcher == null || !connection.dispatcher.speaking){//If the dispatcher does not exist or has ended start playing 
        if(connection.dispatcher != null)
            console.log("DEBUG: speaking = " + connection.dispatcher.speaking);
        console.log("DEBUG: disp = null?" + connection.dispatcher);
        playNext(connection); 
    }
}

function dequeue(connection){
    if(queues.get(connection) == null)
        return null;
    return queues.get(connection).pop();
}
function playNext(connection){
    var song; 
    if((song = dequeue(connection)) == null){
        connection.disconnect();
    }else{
        var dispatcher = connection.playStream(ytdl(song,{filter : 'audioonly'}),streamOptions);
        dispatcher.on('end',() => {
            playNext(connection);// MMMMMMMMM
        });

    }
}

client.login(auth.token);


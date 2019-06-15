const gulp = require('gulp');
const axios = require('axios');
const fs = require('fs'); 

// http://misfitscentral.com/display.php?t=lyrtab&f=77to83.lyr
// http://misfitscentral.com/display.php?t=lyrtab&f=77to83.tab
// http://misfitscentral.com/display.php?t=lyrtab&f=m95ap.lyr
// http://misfitscentral.com/display.php?t=lyrtab&f=m95ap.tab
// http://misfitscentral.com/display.php?t=lyrtab&f=m95fm.lyr
// http://misfitscentral.com/display.php?t=lyrtab&f=m95fm.tab

let capitalize = (s) => {
    s = s.toLowerCase().split(' ');
    for (i in s) {
        if (s[i].length) {
            s[i] = s[i][0].toUpperCase() + s[i].substring(1);
        }
    }
    return s.join(' ');
}

let songSets = {
    "77to83": "1977 to 1983",
    "m95ap": "American Psycho",
    "m95fm": "Famous Monsters",
}

let getLyricsFromLines = (lines, songSet) => {
    var lyrics = [];
    var numLines = lines.length;
    var processingLyrics = false;
    for (var i = 0; i < numLines; i++) {
        if (lines[i].match(/^-{3,}$/)) {
            processingLyrics = true;
            var title = capitalize(lines[i - 1].split(' [')[0]);
            if (lyrics.length > 0) {
                lyrics[lyrics.length - 1].end = i - 1;
            }
            lyrics.push({
                "title": title,
                "set": songSet,
                "start": i + 1
            });
        }
        if (processingLyrics && lines[i].match(/^={3,}$/)) {
            lyrics[lyrics.length - 1].end = i - 1;
            break;
        }
    }
    for (i in lyrics) {
        while (lines[lyrics[i].end - 1] === '') {
            lyrics[i].end--;
        }
        lyrics[i].lyrics = lines.slice(lyrics[i].start, lyrics[i].end).join('\n');
    }
    return lyrics;    
}

gulp.task('build-lyrics', (cb) => {
    for (songSet in songSets) {
        console.log("Starting lyrics for " + songSet);
        axios.get('http://misfitscentral.com/display.php?t=lyrtab&f=' + songSet + '.lyr')
            .then(function (response) {
                var songSetId = response.config.url.slice(49, -4);
                var lyrics = getLyricsFromLines(response.data.split('\n'), songSets[songSetId]);
                fs.writeFile("data/lyrics/" + songSetId + ".json", JSON.stringify(lyrics), 'utf8', function (err) {
                    if (err) {
                        console.log("An error occured while writing JSON Object to File.");
                        return console.log(err);
                    }
                 
                    console.log("JSON file has been saved.");
                }); 
                console.log("Done with lyrics for " + songSetId);
            })
            .catch(function (error) {
                console.log(error);
            });
    }
    cb();
});

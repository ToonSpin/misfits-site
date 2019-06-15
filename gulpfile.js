const gulp = require('gulp');
const axios = require('axios');
const fs = require('fs'); 
const log = require('fancy-log');
const c = require('ansi-colors');
const clean = require('gulp-clean');

let capitalize = (s) => {
    s = s.toLowerCase().split(' ');
    for (i in s) {
        if (s[i].length) {
            s[i] = s[i][0].toUpperCase() + s[i].substring(1);
        }
    }
    return s.join(' ');
}

let slug = (s) => {
    return s.toLowerCase().split(/[^a-z0-9]+/).join('-');
}

let songSets = {
    "77to83": "1977 to 1983",
    "m95ap": "American Psycho",
    "m95fm": "Famous Monsters",
}

let getLyricsFromLines = (lines, songSet) => {
    var lyricsArr = [];
    var numLines = lines.length;
    var processing = false;
    for (var i = 0; i < numLines; i++) {
        if (lines[i].match(/^-{3,}$/)) {
            processing = true;
            var title = capitalize(lines[i - 1].split(' [')[0]);
            if (lyricsArr.length > 0) {
                lyricsArr[lyricsArr.length - 1].end = i - 1;
            }
            lyricsArr.push({
                "title": title,
                "set": songSet,
                "start": i + 1
            });
        }
        if (processing && lines[i].match(/^={3,}$/)) {
            lyricsArr[lyricsArr.length - 1].end = i - 1;
            break;
        }
    }
    var lyrics = {};
    for (i in lyricsArr) {
        while (lines[lyricsArr[i].end - 1] === '') {
            lyricsArr[i].end--;
        }
        lyricsArr[i].lyrics = lines.slice(lyricsArr[i].start, lyricsArr[i].end).join('\n');
        lyrics[slug(lyricsArr[i].title)] = lyricsArr[i];
    }
    return lyrics;
}

gulp.task('scrape-lyrics', async (cb) => {
    for (songSet in songSets) {
        // log.info("Fetching lyrics for " + c.yellow(songSets[songSet]));
        await axios.get('http://misfitscentral.com/display.php?t=lyrtab&f=' + songSet + '.lyr')
            .then(function (response) {
                var songSetId = response.config.url.slice(49, -4);
                var lyrics = getLyricsFromLines(response.data.split('\n'), songSets[songSetId]);
                for (songSlug in lyrics) {
                    fs.writeFileSync("data/lyrics/" + songSetId + "." + songSlug + ".json", JSON.stringify(lyrics[songSlug]), 'utf8');
                }
                log.info("Done with lyrics for " + c.yellow(songSets[songSetId]));
            })
            .catch(function (error) {
                log.error(error);
            });
    }
    cb();
});


let getTabsFromLines = (lines, songSet) => {
    var tabsArr = [];
    var numLines = lines.length;
    var processing = false;
    for (var i = 0; i < numLines; i++) {
        if (lines[i].match(/^={3,}$/)) {
            processing = true;
            var titleAndVersion = capitalize(lines[i - 1].split(' [')[0]).split(' - ');
            var title = titleAndVersion[0];
            var version = titleAndVersion[1];

            if (tabsArr.length > 0) {
                tabsArr[tabsArr.length - 1].end = i - 1;
            }
            tabsArr.push({
                "title": title,
                "version": version,
                "set": songSet,
                "start": i + 1
            });
        }
        if (processing && lines[i].match(/^%{3,}$/)) {
            tabsArr[tabsArr.length - 1].end = i - 1;
            break;
        }
    }
    var tabs = {};
    for (i in tabsArr) {
        while (lines[tabsArr[i].end - 1] === '') {
            tabsArr[i].end--;
        }
        tabsArr[i].tabs = lines.slice(tabsArr[i].start, tabsArr[i].end).join('\n');
        var titleSlug = slug(tabsArr[i].title);
        if (!tabs.hasOwnProperty(titleSlug)) {
            tabs[titleSlug] = [];
        }
        tabs[titleSlug].push(tabsArr[i]);
    }
    return tabs;
}

gulp.task('scrape-tabs', async (cb) => {
    for (songSet in songSets) {
        // log.info("Fetching tabs for " + c.yellow(songSets[songSet]));
        await axios.get('http://misfitscentral.com/display.php?t=lyrtab&f=' + songSet + '.tab')
            .then(function (response) {
                var songSetId = response.config.url.slice(49, -4);
                var tabs = getTabsFromLines(response.data.split('\n'), songSets[songSetId]);
                for (songSlug in tabs) {
                    fs.writeFileSync("data/tabs/" + songSetId + "." + songSlug + ".json", JSON.stringify(tabs[songSlug]), 'utf8');
                }
                log.info("Done with tabs for " + c.yellow(songSets[songSetId]));
            })
            .catch(function (error) {
                log.error(error);
            });
    }
    cb();
});

gulp.task('clean', () => {
    return gulp.src(['data/**/*.json'], {
        dot: true
    }).pipe(clean())
});


gulp.task('scrape', gulp.parallel('scrape-lyrics', 'scrape-tabs'));

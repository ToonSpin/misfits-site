const gulp = require('gulp');
const { series, parallel } = require('gulp');
const axios = require('axios');
const fs = require('fs'); 
const log = require('fancy-log');
const c = require('ansi-colors');
const clean = require('gulp-clean');
const through2 = require('through2');
const rename = require("gulp-rename");
const Twig = require('twig');
const twig = Twig.twig;

function renderLyrics() {
    var template = twig({
        id: "lyrics",
        data: fs.readFileSync('./twig/lyrics.twig', {encoding: 'utf-8'}),
    });

    return gulp.src('data/lyrics/*.json')
        .pipe(through2.obj(function(file, _, cb) {
            if (file.isBuffer()) {
                var jsonData = JSON.parse(file.contents.toString());
                file.contents = Buffer.from(template.render(jsonData));
            }
            cb(null, file);
        }))
        .pipe(rename({
            extname: '.html',
        }))
        .pipe(gulp.dest('dist/lyrics/'));
}

function renderTabs() {
    var template = twig({
        id: "tabs",
        data: fs.readFileSync('./twig/tabs.twig', {encoding: 'utf-8'}),
    });

    return gulp.src('data/tabs/*.json')
        .pipe(through2.obj(function(file, _, cb) {
            if (file.isBuffer()) {
                var jsonData = JSON.parse(file.contents.toString());
                file.contents = Buffer.from(template.render(jsonData));
            }
            cb(null, file);
        }))
        .pipe(rename({
            extname: '.html',
        }))
        .pipe(gulp.dest('dist/tabs/'));
}

function capitalize(s) {
    s = s.toLowerCase().split(' ');
    for (i in s) {
        if (s[i].length) {
            s[i] = s[i][0].toUpperCase() + s[i].substring(1);
        }
    }
    return s.join(' ');
}

function slug(s) {
    return s.toLowerCase().split(/[^a-z0-9]+/).join('-');
}

let songSets = {
    "77to83": "1977 to 1983",
    "m95ap": "American Psycho",
    "m95fm": "Famous Monsters",
}

function getLyricsFromLines(lines, songSet) {
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

async function scrapeLyrics(cb) {
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
}

function getTabsFromLines(lines, songSet) {
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
            tabs[titleSlug] = {
                title: tabsArr[i].title,
                set: tabsArr[i].set,
            }
            tabs[titleSlug].versions = [];
        }
        tabs[titleSlug].versions.push(tabsArr[i]);
    }
    return tabs;
}

async function scrapeTabs(cb) {
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
}

function cleanData(cb) {
    return gulp.src(['data/**/*.json'], {
        dot: true
    }).pipe(clean())
    cp();
}

function cleanDist(cb) {
    return gulp.src(['dist/'], {
        dot: true,
        allowEmpty: true,
    }).pipe(clean())
    cp();
}

exports.scrape = parallel(scrapeLyrics, scrapeTabs);
exports.clean = parallel(cleanData, cleanDist);
exports.render = series(cleanDist, parallel(renderLyrics, renderTabs));

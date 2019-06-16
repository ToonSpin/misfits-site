# Misfits lyrics and tabs website generator

## What is this?

This can scrape www.misfitscentral.com for Misfits lyrics and tabs and create a
static website from the result. The resulting website is more or less responsive
and is quite printer friendly. Most notably it will split up the lyrics into
stanzas and make columns so you can have it on one page.

Some or all of the following may not work on Windows. It has only been tested on
my personal Manjaro machine.

The code is quite ugly.

## How to use

Before doing anything, make sure you have a recent npm install and run `npm
install` in the project root.

To scrape the site and create `.json` files in the `data` directory, run this in
the project root:

    ./node_modules/.bin/gulp scrape

To take the `.json` files and create a site from it in the `dist` directory, run
this in the project root:

    ./node_modules/.bin/gulp render

To throw away all the data and start over, run 
this in the project root:

    ./node_modules/.bin/gulp clean

To get an Apache Docker container that listens on port 8000 so you can see the
site live at http://localhost:8000, run this in the project root:

    docker run --rm \
        --mount type=bind,src=`pwd`/dist,dst=/usr/local/apache2/htdocs \
        -p 8000:80 \
        httpd

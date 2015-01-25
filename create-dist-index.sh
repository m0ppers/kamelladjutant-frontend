#!/bin/sh

sed -e '/START DEVELOPMENT/,/END DEVELOPMENT/{s/.*//g;}' index.html | sed -e '/START PRODUCTION/,/END PRODUCTION/{s/<!--//g;s/-->//g;s/START PRODUCTION//g;s/END PRODUCTION//g;}' | sed '/^\s*$/d'

#!/usr/bin/bash

rm -f latest.log
result=1
while [ $result -ne 0 ];
do
    node --max-old-space-size=2048 main.js 2>&1 | tee -a latest.log
    result=${PIPESTATUS[0]}
done
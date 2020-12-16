result=1
while [ $result -ne 0 ];
do
    node --max-old-space-size=2048 main.js
    result=$?
done
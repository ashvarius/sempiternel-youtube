result=1
while [ $result -ne 0 ];
do
    node main.js
    result=$?
done
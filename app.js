const express = require('express');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const path = require('path');

const expressAppInstance= express();
expressAppInstance.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db;

const initializeDbAndServer = async()=>{
    try{
        db = await open({
            filename:dbPath,
            driver: sqlite3.Database
        })
        expressAppInstance.listen(3000, ()=>{
            console.log("Server initialized at port 3000")
        })
    }catch(e){
        console.log(`Database error ${e.message}`)
    }
}

initializeDbAndServer();

const authenticateUser = (request, response, next)=>{
    const authHeader = request.headers["authorization"]

    let jwtToken;

    if (authHeader === undefined){
        response.status(401)
        response.send("Invalid JWT Token")
    }else{
        jwtToken = authHeader.split("Bearer ")[1]
        if (jwtToken === undefined){
            response.send(401)
            response.status('Invalid JWT Token')
        }else{
            jwt.verify(jwtToken, "The_secret", (error, payload)=>{
                if(error){
                    response.status(401)
                    response.send('Invalid JWT Token')
                }else{
                    next()
                }
            })
        }
    }

}


expressAppInstance.post('/login/', async(request, response)=>{
    const {username, password} = request.body;

    let userObject;
    const getUserObjectQuery = `SELECT * FROM user WHERE username like "${username}"`;

    try{
        userObject = await db.get(getUserObjectQuery);
        if (userObject === undefined){
            response.status(401)
            response.send("Invalid user")
        }else{
            let isPasswordsMatching = await bcrypt.compare(password, userObject.password)
            console.log(isPasswordsMatching)
            if (isPasswordsMatching){
                console.log("login Success")
                const payload = {
                    username:username
                }
                const jwtToken = jwt.sign(payload, "The_secret")
                console.log(jwtToken)
                response.send({jwtToken})
            }else{
                console.log("Invalid password")
                response.status(401)
                response.send('Invalid Password')
            }
        }
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }

})

//API-1 getStates

expressAppInstance.get('/states/', authenticateUser, async(request, response)=>{
    const getStatesQuery = `SELECT state_id as stateId, state_name as stateName, population FROM state`;
    try{
        let arrayOfStateObjects = await db.all(getStatesQuery)
        response.send(arrayOfStateObjects)
    }
    catch(e){
        console.log(`Database Error ${e.message}`)
    }
})

//API-2 getState

expressAppInstance.get("/states/:stateId", authenticateUser, async(request, response)=>{
    let {stateId} = request.params;
    stateId = parseInt(stateId)
    
    const getStateQuery = `SELECT state_id as stateId, state_name as stateName, population FROM state WHERE state_id = ${stateId}`
    try{
        const stateObject = await db.get(getStateQuery)
        response.send(stateObject)
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }
    
    
})
    

//API - 3 createDistrict

expressAppInstance.post("/districts/", authenticateUser, async(request, response)=>{
    const districtObject = request.body;
    const{districtName, stateId ,cases, cured, active,deaths} = districtObject
    
    const createDistrictQuery = `INSERT INTO district(district_name, state_id ,cases, cured, active,deaths)
    VALUES('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths})`;

    try{
        await db.run(createDistrictQuery)
        response.send('District Successfully Added')
    }catch(e){
        console.log(`DataBase Error ${e.message}`)
    }
})
    

//API-4 getDistrict

expressAppInstance.get('/districts/:districtId', authenticateUser, async(request, response)=>{
    let {districtId} = request.params;
    districtId = parseInt(districtId)
    
    const getDistrictQuery = `SELECT district_id as districtId, district_name as districtName, state_id as stateId, cases, cured, active, deaths FROM district WHERE district_id = ${districtId}`
    try{
        const districtObject = await db.get(getDistrictQuery)
        response.send(districtObject)
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }
    
})

//API-5 deleteDistrict

expressAppInstance.delete('/districts/:districtId', authenticateUser, async(request, response)=>{
    let {districtId} = request.params;
    districtId = parseInt(districtId)

    const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId}`

    try{
        await db.run(deleteDistrictQuery)
        response.send('District Removed')
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }

})

//API-6 updateDistrict

expressAppInstance.put("/districts/:districtId", authenticateUser, async(request, response)=>{
    let {districtId} = request.params;
    districtId = parseInt(districtId)

    let districtObject = request.body;

    const{districtName,stateId, cases, cured, active, deaths} = districtObject
    
    const updateDistrictQuery = `UPDATE district SET district_name = "${districtName}", state_id = ${stateId},
    cases = ${cases}, cured=${cured}, active = ${active}, deaths= ${deaths}
    WHERE district_id = ${districtId}`

    try{
        await db.run(updateDistrictQuery);
        response.send("District Details Updated");
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }    
})

//API-7 getStats

expressAppInstance.get("/states/:stateId/stats", authenticateUser, async(request, response)=>{
    let {stateId} = request.params;
    stateId = parseInt(stateId);

    const getStatsQuery = `SELECT SUM(cases) as totalCases, SUM(cured) as totalCured, SUM(active) as totalActive, SUM(deaths) as totalDeaths FROM district WHERE state_id = ${stateId}`
    try{
        const responseObject = await db.get(getStatsQuery);
        response.send(responseObject)   
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }
    
})

//API-8 getStateNameByDistrictId

expressAppInstance.get('/districts/:districtId/details/',authenticateUser, async(request, response)=>{
    let {districtId} = request.params;
    districtId = parseInt(districtId);

    const getStateNameByDistrictIdQuery = `SELECT state_name as stateName FROM state NATURAL JOIN district WHERE district_id=${districtId}`
    try{
        const stateNameObject = await db.all(getStateNameByDistrictIdQuery);
        response.send(stateNameObject[0])
    }catch(e){
        console.log(`Database Error ${e.message}`)
    }
})


module.exports = expressAppInstance;
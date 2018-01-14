 //==========================
// Set up
//==========================
var express = require("express");
var app = express();
var path = require('path');
var passport = require("passport")
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var store = require('store')


const OTHER_GENDER = 2
const FEMALE_GENDER = 1
const MALE_GENDER = 0


app.set('port', 3030); // set port
app.use(express.static(__dirname + '/public')); // static files
app.set("view engine", "ejs");

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var mongoose = require("mongoose");
// mongoose.connect("mongodb://localhost/socialservices");


//==========================
// Models
//==========================

//==========================
// Routes
//==========================
app.get('/', function(req, res) {
    res.redirect('/setGender');
});
 
app.post('/setGender', function(req, res){

  let parsedGender = Number(req.body.gender);
  if(parsedGender !== MALE_GENDER){
    res.redirect('/setIsPregnant')
  }
  else {
    res.redirect('/setIncome')
  }
});

app.post('/setIsPregnant', function(req, res){
  let isPregnant = Boolean(req.body.isPregnant);
  store.set('isPregnant', {value: isPregnant } )
  res.redirect('/setIncome');
});

app.post('/setIncome', function(req, res){
  let income = Number(req.body.income);
  store.set('income', {income: income} )
  res.redirect('/setHouseholdSize')
});

app.post('/setHouseholdSize', function(req, res){

  let householdSize = Number(req.body.householdSize);
  store.set('visitor', { householdSize: householdSize })

  res.redirect('/setIsFosterChild')
});

app.post('/setIsFosterChild', function(req, res){

  let isFoster = String(req.body.isFoster);
  store.set('visitor', { isFoster: isFoster })

  res.redirect('/setAge')
})

app.post('/setAge', function(req, res){


  let age = Number(req.body.age);

  res.redirect('/setIsDisabled')
})

app.post('/setIsDisabled', function(req, res){
  let question = "Are you disabled?"

  let isDisabled = Boolean(req.body.isDisabled);

  res.redirect('/setIsStudent');
})

app.post('/setIsStudent', function(req, res){
  let isStudent = Boolean(req.body.isStudent);

  res.redirect('/preSubmitPage')
})

app.post('/viewResults', function(req, res){
  let selectedGender = req.body.selectedGender
  let isPregnant = req.body.isPregnant
  let isFoster = req.body.isFoster
  let isDisabled = req.body.isDisabled
  let isStudent = req.body.isStudent
  let income = req.body.income
  let age = req.body.age
  let householdSize = req.body.householdSize

  let userInfo = {
    income: Number(income),
    age: Number(age),
    wasFosterChild: Boolean(isFoster),
    isPregnant: Boolean(isPregnant),
    isUSCitizen: true,
    householdsize: Number(householdSize),
  }
  let snap = findSnapBenefitsEligibility(userInfo)
  let cash = findCashAssistanceEligibility(userInfo)
  let health = findHealthcareBenefitEligibility(userInfo)

  let results = {
    canGetSnap: snap > 0 ? true : false,
    maxSnapBenefits: getMaxSNAPBenefits(userInfo.householdsize),
    canGetCashAssistance: (cash > 0 )? true : false, 
    maxCashAssistance: getCashBenefitForHouseholdSize(userInfo.householdsize),
    eligibleForHealthcare: health
  }
  console.log("results line 131: " + results);
  res.render('results', results);
})

//Get routes
app.get('/setGender', function(req, res){
  let question = "What is your Gender?"

  res.render('genderInput', {
    fQuestion: question,
    fAction: "/setGender",
    fValue: "gender",
  })
});

app.get('/setIncome', function(req, res){
  let question = "What is your monthly income?"
  
  res.render('textInput', {
    fQuestion: question,
    fAction: "/setIncome",
    fValue: "income",
  })

});

app.get('/setHouseholdSize', function(req, res){
  let question = "How large is your household (Including yourself)?"
  res.render('textInput', {
    fQuestion: question,
    fAction: "/setHouseholdSize",
    fValue: "householdSize",
  })

});

app.get('/setIsPregnant', function(req, res){
  let question = "Are you pregnant?"

  res.render('yesNoInput', {
    fQuestion: question,
    fAction: "/setIsPregnant",
    fValue: "isPregnant",
  })
});

app.get('/setIsFosterChild', function(req, res){
  let question = "Were/Are you a foster child?"

  res.render('yesNoInput', {
    fQuestion: question,
    fAction: "/setIsFosterChild",
    fValue: "isFosterChild",
  })
})

app.get('/setAge', function(req, res){
  let question = "How old are you?"

  res.render('textInput', {
    fQuestion: question,
    fAction: "/setAge",
    fValue: "age"
  })
})

app.get('/setIsDisabled', function(req, res){
  let question = "Are you disabled?"

  res.render('yesNoInput', {
    fQuestion: question,
    fAction: "/setIsDisabled",
    fValue: "isDisabled",
  })
})

app.get('/setIsStudent', function(req, res){
  let question = "Are you a student?"

  res.render('yesNoInput', {
    fQuestion: question,
    fAction: "/preSubmitPage",
    fValue: "isStudent",
  })
})

app.post('/preSubmitPage', function(req, res){
  res.render('preSubmit')
})

app.get('/testLocal', function(req, res){
  res.send(store.get('isPregnant'));
})

//==========================
// Error Handling routes
//==========================
app.use(function(req,res){
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

//==========================
// Start server
//==========================
app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});


// App functions

function createLocalStorageIfItDoesntExist(){
  if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
  }
}
function findSnapBenefitsEligibility(visitorInfo){
  let eligibility = 0;
  if(visitorInfo.income < getFederalPovertyLineForHouseholdSize(visitorInfo.householdsize)){
      eligibility = getSNAPBenefits(visitorInfo.householdsize, visitorInfo.income);
  }
  return eligibility;
}

function findCashAssistanceEligibility(visitorInfo){
  //Source: https://des.az.gov/content/cash-assistance-ca-income-eligibility-guidelines
  let cashAssistance = 0;
  if (visitorInfo.income < getFederalPovertyLineForHouseholdSize(visitorInfo.householdsize)){
    console.log("alright do we even get here ")
      cashAssistance = getCashBenefitForHouseholdSize(visitorInfo.householdsize)
  }
  return cashAssistance;

}

function findHealthcareBenefitEligibility(visitorInfo){
  console.log(visitorInfo);
  if (checkIfMedicaidEligible(visitorInfo))
        return "medicaid"
    if (checkIfFosterChild(visitorInfo))
        return 'yoAdultTrans'
    if (checkIfExpecting(visitorInfo))
        return 'aacs-preg'
    if (checkIfQualifiesForAccess(visitorInfo))
        return 'access'
  return 'none';
  }
function checkIfMedicaidEligible(userInfo){
  if (userInfo.age > 64)
      return true
}
function checkIfFosterChild(visitorInfo){
  return visitorInfo.wasFosterChild;
}
function checkIfExpecting(visitorInfo) {
  return visitorInfo.isPregnant;
}
function checkIfQualifiesForAccess(visitorInfo){
  //Citation: https://azahcccs.gov/Members/GetCovered/Categories/adults.html
  return (visitorInfo.income < getPovertyLineForHouseholdSize(visitorInfo.householdsize) && visitorInfo.isUSCitizen)
}
function checkIfQualifiesForSNAP(income, householdsize) {
  return income < getFederalPovertyLineForHouseholdSize(householdsize);
}
function getSNAPBenefits(householdsize, income){
  let benefit = 0;
  switch(householdsize) {
      case 1 : benefit = 192
      break;
      case 2 : benefit = 352
      break;
      case 3 : benefit = 504
      break;
      case 4 : benefit = 640 
      break;
      case 5 : benefit = 760 
      break; 
      case 6 : benefit = 913 
      break;
      case 7 : benefit = 1009 
      break;
      case 8 : benefit = 1153 
      break;
      default: 
      benefit = 1153
  }
  return benefit - (income * .3)
}
function getMaxSNAPBenefits(householdsize){
  let benefit = 0;
  switch(householdsize) {
      case 1 : benefit = 192
      break;
      case 2 : benefit = 352
      break;
      case 3 : benefit = 504
      break;
      case 4 : benefit = 640 
      break;
      case 5 : benefit = 760 
      break; 
      case 6 : benefit = 913 
      break;
      case 7 : benefit = 1009 
      break;
      case 8 : benefit = 1153 
      break;
      default: 
      benefit = 1153
  }
  return benefit
}
function getCashBenefitForHouseholdSize(householdsize, getsA1){
  let cashBenefit;
  switch(householdsize) {
      case 1 : cashBenefit = getsA1 ? 164 : 103
      break;
      case 2 : cashBenefit = getsA1 ? 220 : 139 
      break;
      case 3 : cashBenefit = getsA1 ? 278 : 175 
      break;
      case 4 : cashBenefit = getsA1 ? 335 : 221
      break;
      case 5 : cashBenefit = getsA1 ? 392 : 247 
      break; 
      case 6 : cashBenefit = getsA1 ? 449 : 238 
      break;
      case 7 : cashBenefit = getsA1 ? 506 : 319
      break;
      case 8 : cashBenefit =  getsA1 ? 563 : 355
      break;
      case 9 : cashBenefit =  getsA1 ? 620 : 391
      break;
      case 10 : cashBenefit =  getsA1 ? 677 : 427
      break;
      case 11 : cashBenefit =  getsA1 ? 734 : 463
      break;
      case 12 : cashBenefit =  getsA1 ? 791 : 499
      break;
      default: 
      cashBenefit =  getsA1 ? 791 : 499
  }
  return cashBenefit;
}
function getFederalPovertyLineForHouseholdSize(householdsize){

  let incomeLimit;
  switch(householdsize) {
      case 1 : incomeLimit = 990
      break;
      case 2 : incomeLimit = 1335 
      break;
      case 3 : incomeLimit = 1680 
      break;
      case 4 : incomeLimit = 2025 
      break;
      case 5 : incomeLimit = 2370 
      break; 
      case 6 : incomeLimit = 2715 
      break;
      case 7 : incomeLimit = 3061 
      break;
      case 8 : incomeLimit = 3408 
      break;
      default: 
      incomeLimit = 3408 + ((householdsize - 8) * 3408)
  }
  return incomeLimit;
  
}
function getPovertyLineForHouseholdSize(householdsize){
  let incomeLimit;
  switch(householdsize) {
      case 1 : incomeLimit = 1337
      break;
      case 2 : incomeLimit = 1800 
      break;
      case 3 : incomeLimit = 2264 
      break;
      case 4 : incomeLimit = 2727 
      break;
      case 5 : incomeLimit = 3190 
      break; 
      default: 
      incomeLimit = 3190 + ((householdsize - 5) * 463)
  }
  return incomeLimit;
}
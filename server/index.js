const express = require('express')
const app = express();
const path = require('path')
const fileUpload = require("express-fileupload");
const fs = require("fs");
const {
  DocumentAnalysisClient,
  AzureKeyCredential,
} = require("@azure/ai-form-recognizer");
var session = require('express-session');
var flash = require('connect-flash');

// Load the .env file if it exists
const dotenv = require("dotenv");
dotenv.config();

//Load the port number from .env file
const port = process.env.PORT;

//Static file
app.use('/public', express.static('public'))
app.use(session({
  secret: 'webslesson',
  cookie: { maxAge: 60000 },
  saveUninitialized: false,
  resave: false
}));

app.use(flash());

//EJS
app.set('view engine', "ejs");

// enable files upload
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.get('/', (req, res) => {
  res.render('index', { data: 'data',message : req.flash('success') })
});

app.post('/extractdata', (req, res, next) => {
  try {
    if (!req.files) {
      return res.status(400).send("No files were uploaded.");
    }
    let file = req.files.file;
    uploadPath = __dirname + "\\uploads\\" + new Date().getTime() + '.jpg'
    file.mv(uploadPath, async () => {
      main(uploadPath)
        .then((data) => {
          req.flash('success', req.uploadPath)
          res.render('index', { data: JSON.stringify(data) });
          // console.log("Data Extracted");
          console.log("Data Extracted:", data);
        }
        )
    });
  } catch (error) {
    console.error("The sample encountered an error:", error);
    process.exit(1);
  }
});

async function main(file) {
  // You will need to set these environment variables or edit the following values
  const endpoint = process.env["FORM_RECOGNIZER_ENDPOINT"] ?? "<cognitive services endpoint>";
  const apiKey = process.env["FORM_RECOGNIZER_API_KEY"] ?? "<api key>";

  if (!fs.existsSync(file)) {
    throw new Error(`Expected file "${file}" to exist.`);
  }

  const readStream = fs.createReadStream(file);

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
  const poller = await client.beginAnalyzeDocument("prebuilt-idDocument", readStream, {
    contentType: "image/jpeg",
    onProgress: (state) => {
      console.log(`status: ${state.status}`);
    },
  });

  const {
    documents: [result]
  } = await poller.pollUntilDone();

  if (result) {
    // The identity document model has multiple document types, so we need to know which document type was actually
    // extracted.
    if (result.docType === "idDocument.driverLicense") {
      const data = {
        idType: result.docType,
        "info": {
          "idNumber": result.fields.DocumentNumber.content,
          "name": (result.fields.FirstName.content) + " " + (result.fields.LastName.content),
          "address": result.fields.Address.content,
          "endorsements": result.fields.Endorsements.content,
          "dob": result.fields.DateOfBirth.content,
          "sex": result.fields.Sex.content,
          "eyeColor": result.fields.EyeColor.content,
          "height": result.fields.Height.content,
          "weight": result.fields.Weight.content,
          "dateOfIssue": result.fields.DateOfIssue.content,
          "dateOfExpiration": result.fields.DateOfExpiration.content,
          "countryregion": result.fields.CountryRegion.value,
          "region": result.fields.Region.value,
          "restrictions": result.fields.Restrictions.value,
          "documentDiscriminator": result.fields.DocumentDiscriminator.content
        }
      }
      // const Data=data.split(',','/n');
      // For the sake of the example, we'll only show a few of the fields that are produced.
      return  data ;
    } else if (result.docType === "idDocument.residencePermit") {
      const data = {
        idType: result.docType,
        "info": {
          "idNumber": result.fields.DocumentNumber.content,
          "category": result.fields.Category.content,
          "name": (result.fields.FirstName.content) + " " + (result.fields.LastName.content),
          "placeOfBirth": result.fields.PlaceOfBirth.content,
          "dob": result.fields.DateOfBirth.content,
          "sex": result.fields.Sex.content,
          "dateOfIssue": result.fields.DateOfIssue.content,
          "dateOfExpiration": result.fields.DateOfExpiration.content,
          "counturyregion": result.fields.CountryRegion.value,
        }
      };
      return data;
    } else if (result.docType === "idDocument.usSocialSecurityCard") {
      const data = {
        idType: result.docType,
        "info": {
          "idNumber": result.fields.DocumentNumber.content,
          "name": (result.fields.FirstName.content) + " " + (result.fields.LastName.content),
          "dateOfIssue": result.fields.DateOfIssue.content,
        }
      };
      return data;
    } else if (result.docType === "idDocument.passport") {
      const data = {
        idType: result.docType,
        "info": {
          "idNumber": result.fields.DocumentNumber.content,
          "name": (result.fields.FirstName.content) + " " + (result.fields.LastName.content),
          "placeOfBirth": result.fields.PlaceOfBirth.content,
          "placeOfIssue": result.fields.PlaceOfIssue.content,
          "personalNumber": result.fields.PersonalNumber.content,
          "dob": result.fields.DateOfBirth.content,
          "sex": result.fields.Sex.content,
          "dateOfIssue": result.fields.DateOfIssue.content,
          "dateOfExpiration": result.fields.DateOfExpiration.content,
          "countryregion": result.fields.CountryRegion.value,
        },
        "MachineReadableZone": {
          "name": (result.fields.MachineReadableZone.properties.FirstName.content) + " " + (result.fields.MachineReadableZone.properties.LastName.content),
          "dob": result.fields.MachineReadableZone.properties.DateOfBirth.content,
          "sex": result.fields.MachineReadableZone.properties.Sex.content,
          "dateOfExpiration": result.fields.MachineReadableZone.properties.DateOfExpiration.content,
          "countryregion": result.fields.MachineReadableZone.properties.CountryRegion.content,
        }
      };
      return data;
    }
    else if (result.docType === "idDocument.nationalIdentityCard") {
      // The nationalidentitycard document type extracts 
      console.log(result.fields)
      console.log(result.docType)
      return result.fields;
    }
    else {
      // The only reason this would happen is if the client library's schema for the prebuilt identity document model is
      // out of date, and a new document type has been introduced.
      const data = {
        idType: result.docType,
        "info": {
          "idNumber": result.fields.DocumentNumber.content,
          "name": (result.fields.FirstName.content) + " " + (result.fields.LastName.content),
          "dob": result.fields.DateOfBirth.content,
        }
      };
      return data;
    }
  } else {
    throw new Error("Expected at least one receipt in the result.");
  }
}


app.listen(port, () => {
  console.log(`App listen on PORT ${port}`)
})

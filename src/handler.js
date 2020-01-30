var https = require("https");
var fs = require("fs");
const os = require("os");
const aws = require("aws-sdk");
const s3 = new aws.S3({
  signatureVersion: "v4",
  apiVersion: "2006-03-01",
  region: "us-east-1"
});
const childProcess = require("./chiledProcess");
module.exports.ffmpeg = (event, ctx, cb) => {
  // get the link to the file download it then convert it to mp3 then put it to s3 return the link to the s3
  const fileUrl = event.queryStringParameters.fileUrl;
  // const fileName = event.queryStringParameters.fileName
  // download the file from s3 to a local filesystem
  const fileName = fileUrl.split("/")[fileUrl.split("/").length - 1];
  const fileArray = fileName.split(".");
  const newArray = [...fileArray];
  newArray[fileName.split(".").length - 1] = "mp3";
  const outputFile = newArray.join(".");

  const file = fs.createWriteStream(`/tmp/${fileName}`);

  const request = https.get(fileUrl, function(response) {
    response.pipe(file);

    file.on("finish", () => {
      childProcess
        .spawn(
          "/opt/bin/ffmpeg",
          [
            "-loglevel",
            "error",
            "-y",
            "-i",
            `/tmp/${fileName}`,

            `/tmp/${outputFile}`
          ],
          { env: process.env, cwd: os.tmpdir() }
        )
        .then(f => {
          const file = fs.readFileSync(`/tmp/${outputFile}`);
          const params = {
            Key: outputFile,
            Bucket: "bluedot-test",
            Body: file
          };
          s3.upload(params, err => {
            if (err) {
              console.log(err);
            }
            console.log("file is uploaded to s3");
          });
        });

      res = {
        statusCode: 200,
        // isBase64Encoded: true,
        // headers: {
        //   "Content-type": "application/pdf"
        // },
        body: fileName
      };

      cb(null, res);
    });
  });
};

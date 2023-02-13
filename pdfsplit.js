const AWS = require("aws-sdk")
const s3 = new AWS.S3()
// const Sharp = require("sharp")
// const pdf = require("pdf-page-counter")
// const fs = require("fs")
const { PDFDocument } = require("pdf-lib")
const { pdf2img } = require("pdf2img")

exports.handler = async (event) => {
  const srcBucket = event.Records[0].s3.bucket.name
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  )
  const dstBucket = srcBucket + "-resized"
  const dstKey = "resized-" + srcKey
  // Infer the image type from the file suffix.
  const typeMatch = srcKey.match(/\.([^.]*)$/)
  if (!typeMatch) {
    console.log("Could not determine the image type.")
    return
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase()
  if (imageType != "pdf") {
    console.log(`Unsupported file type: ${imageType}`)
    return
  }

  // Download the image from the S3 source bucket.
  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    }
    const origiPdf = await s3.getObject(params).promise()

    const pdfDoc = await PDFDocument.load(origiPdf.Body)
    const subDocument = await PDFDocument.create()

    // copy the page at current index
    const [copiedPage] = await subDocument.copyPages(pdfDoc, [0])
    subDocument.addPage(copiedPage)
    const pdfBytes = await subDocument.save()

    const splitFile = dstKey.split(".pdf")[0]

    console.log("PDF file split and saved to S3 successfully.")

    pdf2img.setOptions({
      type: "png",
      density: 600, // default 600
      outputdir: dstBucket, // output folder, default null (if null given, then it will create folder name same as file name)
      outputname: splitFile, // output file name, dafault null (if null given, then it will create image name same as input name)
    })

    pdf2img.convert(pdfBytes, function (err, info) {
      if (err) console.log(err)
      else console.log(info)
    })

    await s3
      .putObject({
        Bucket: dstBucket,
        Key: splitFile,
        Body: imageFile,
      })
      .promise()
  } catch (error) {
    console.log(error)
    return
  }

  //   console.log(
  //     "Successfully resized " +
  //       srcBucket +
  //       "/" +
  //       srcKey +
  //       " and uploaded to " +
  //       dstBucket +
  //       "/" +
  //       dstKey
  //   )
}

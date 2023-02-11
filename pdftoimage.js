const AWS = require("aws-sdk")
const s3 = new AWS.S3()
const Sharp = require("sharp")
const { fromPath } = require("pdf2pic")
// const pdf = require("pdf-page-counter")
// const fs = require("fs")

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
    const origimage = await s3.getObject(params).promise()

    const options = {
      density: 100,
      saveFilename: dstBucket,
      savePath: dstKey,
      format: "png",
      width: 400,
      height: 400,
    }
    console.log("image", origimage)
    // const image = await Sharp(origimage.Body).metadata()
    console.log("image2", origimage.Body)
    const storeAsImage = await fromPath(srcKey, options)
    const pageToConvertAsImage = 1

    storeAsImage(pageToConvertAsImage).then((resolve) => {
      console.log("Page 1 is now converted as image")

      return resolve
    })
    console.log("image3", storeAsImage)

    // console.log(image)
    // Use the sharp module to resize the image and save in a buffer.
    const resizeParams = {
      width: 200,
      height: 200,
      fit: Sharp.fit.cover,
      position: Sharp.strategy.entropy,
    }

    console.log("re", resizeParams)

    // if (image.width > image.height) {
    //   resizeParams.width = null
    // } else {
    //   resizeParams.height = null
    // }

    const buffer = await Sharp(storeAsImage).resize(resizeParams).toBuffer()

    const destparams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: buffer,
      ContentType: "image",
    }

    const putResult = await s3.putObject(destparams).promise()
  } catch (error) {
    console.log(error)
    return
  }

  console.log(
    "Successfully resized " +
      srcBucket +
      "/" +
      srcKey +
      " and uploaded to " +
      dstBucket +
      "/" +
      dstKey
  )
}

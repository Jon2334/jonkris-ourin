const axios = require('axios')
const FormData = require('form-data')

async function uploadToTempfiles(buffer) {
    const form = new FormData()
    form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' })

    const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: form.getHeaders(),
        timeout: 30000
    })

    if (response.data?.data?.url) {
        return response.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    }
    throw new Error('Upload gagal')
}

async function hdv4(imageUrl) {
    const apiUrl = `https://api-faa.my.id/faa/hdv4?image=${encodeURIComponent(imageUrl)}`
    const res = await axios.get(apiUrl, { timeout: 120000 })

    if (!res.data?.status || !res.data?.result?.image_upscaled) {
        throw new Error('HD enhance gagal')
    }

    return res.data.result.image_upscaled
}

async function hdv3(imageUrl) {
    const apiUrl = `https://api-faa.my.id/faa/hdv3?image=${encodeURIComponent(imageUrl)}`
    const res = await axios.get(apiUrl, { 
        responseType: 'arraybuffer',
        timeout: 120000 
    })

    return Buffer.from(res.data)
}

async function aienhancer(image) {
    let imageUrl = image
    if (Buffer.isBuffer(image)) {
        imageUrl = await uploadToTempfiles(image)
    }

    const resultUrl = await hdv4(imageUrl)

    const imgRes = await axios.get(resultUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
    })

    return {
        input: imageUrl,
        output: resultUrl,
        buffer: Buffer.from(imgRes.data)
    }
}

module.exports = { aienhancer, hdv4, hdv3, uploadToTempfiles }

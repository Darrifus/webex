import express from "express";
import zlib from "zlib";
import { promisify } from "util";
import busboy from "busboy";

const app = express();
const compressGzip = promisify(zlib.gzip);

app.get("/login", (req, res) => {
  res.type("text/plain");
  res.send("dariausoltseva");
});

app.post("/zipper", (req, res) => {
  const cType = req.get("content-type") || "";
  let resultBuffer = null;

  if (cType.includes("multipart/form-data")) {
    const parser = busboy({ headers: req.headers });
    
    parser.on("file", (fieldName, stream, fileInfo) => {
      const parts = [];
      
      stream.on("data", (chunk) => {
        parts.push(chunk);
      });
      
      stream.on("end", () => {
        resultBuffer = Buffer.concat(parts);
      });
    });

    parser.on("close", async () => {
      await sendCompressed(res, resultBuffer);
    });

    req.pipe(parser);
    return;
  }

  const buffers = [];

  req.on("data", (chunk) => {
    buffers.push(chunk);
  });

  req.on("end", async () => {
    resultBuffer = Buffer.concat(buffers);
    await sendCompressed(res, resultBuffer);
  });
});

async function sendCompressed(response, inputData) {
  try {
    const toCompress = inputData || Buffer.from("");
    const gzipped = await compressGzip(toCompress);

    response.set("Content-Type", "application/gzip");
    response.set("Content-Disposition", "attachment; filename=result.gz");
    response.end(gzipped);
  } catch (error) {
    response.status(500).send("Ошибка при сжатии данных");
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const main = async () =>  {
  const app = express();
  app.use(cors());
  app.use(morgan("tiny"));
  app.use(helmet());

  app.get("/" ,(_req, res) => {
    
    res.json({
      message: "Hello from the server!"
    })
  });

  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
}

main().catch(err => {
  console.error(err);
})
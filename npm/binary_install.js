const fs = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const axios = require("axios");

const error = (msg) => {
  console.error(msg);
  process.exit(1);
};

class Binary {
  constructor(name, url) {
    let errors = [];
    if (typeof url !== "string") {
      errors.push("url must be a string");
    } else {
      try {
        new URL(url);
      } catch (e) {
        errors.push(e);
      }
    }
    if (name && typeof name !== "string") {
      errors.push("name must be a string");
    }

    if (!name) {
      errors.push("You must specify the name of your binary");
    }
    if (errors.length > 0) {
      let errorMsg =
        "One or more of the parameters you passed to the Binary constructor are invalid:\n";
      errors.forEach((error) => {
        errorMsg += error;
      });
      errorMsg +=
        '\n\nCorrect usage: new Binary("my-binary", "https://example.com/binary/download.tar.gz")';
      error(errorMsg);
    }
    this.url = url;
    this.name = name;
    this.installDirectory = join(__dirname, "node_modules", ".bin");

    if (!existsSync(this.installDirectory)) {
      fs.mkdirSync(this.installDirectory, { recursive: true });
    }

    this.binaryPath = join(this.installDirectory, this.name);
  }

  exists() {
    return fs.existsSync(this.binaryPath);
  }

  install(fetchoptions, suppressLogs = false) {
    if (this.exists()) {
      if (!suppressLogs) {
        console.error(
          `${this.name} is already installed, skipping installation.`
        );
      }
      return Promise.resolve();
    }

    if (fs.existsSync(this.installDirectory)) {
      function rimraf(directoryPath) {
        fs.readdirSync(directoryPath).forEach((file) => {
          const filePath = `${directoryPath}/${file}`;

          if (fs.lstatSync(filePath).isDirectory()) {
            deleteDirectorySync(filePath); // recursively delete subdirectories
          } else {
            fs.unlinkSync(filePath); // delete files
          }
        });

        fs.rmdirSync(directoryPath); // delete the empty directory
      }

      rimraf(this.installDirectory);
    }

    fs.mkdirSync(this.installDirectory, { recursive: true });

    if (suppressLogs) {
      console.error(`Downloading release from ${this.url}`);
    }

    return axios({ ...fetchOptions, url: this.url, responseType: "stream" })
      .then((res) => {
        return new Promise((resolve, reject) => {
          const sink = res.data.pipe(fs.createWriteStream(this.binaryPath));
          sink.on("finish", () => resolve());
          sink.on("error", (err) => reject(err));
        });
      })
      .then(() => {
        if (suppressLogs) {
          console.error(`${this.name} has been installed!`);
        }
      })
      .catch((e) => {
        error(`Error fetching release: ${e.message}`);
      });
  }

  run(fetchOptions) {
    if (!this.exists()) {
      this.install(fetchoptions, true);
    }

    const [, , ...args] = process.argv;

    const options = { cwd: process.cwd(), stdio: "inherit" };

    const result = spawnSync(this.binaryPath, args, options);

    if (result.error) {
      error(result.error);
    }

    process.exit(result.status);
  }
}

module.exports.Binary = Binary;

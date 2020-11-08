#Audio validator


Run in current directory:
```
git clone git@github.com:slavaGanzin/auditor.git
cd auditor
npm start
```

Folder "data" will be transcibed by default.
You can choose folder yourself (or change package.json *run* section):
```
./server path/to/data/folder
```

*validated* folder will be created at the same level as your data folder:
```
data/
  non processed audio files
validated/
  processed audio files
  validated.csv

```
Processed files will be **moved** to *validated* folder.

validated.csv fields:
- transcribed text,audio quality score
- transcription date
- seconds operator was working on transcription

```sh

cat validated.csv

Four...,gettysburg10.wav,5,2020-11-08T08:27:08.003Z,10.003084
This course...,sample.wav,5,2020-11-08T08:27:14.868Z,6.257778

```

Build cross-platform electron app and you will get nifty folder selection for free:

```
npm run build
```

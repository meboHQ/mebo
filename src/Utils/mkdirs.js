const fs = require('fs');
const path = require('path');
const promisify = require('es6-promisify');

// promisifying
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);


/**
 * Creates folders recursively, in case a level already exist then the level is skipped
 *
 * @param {string} fullPath - path that should be created
 * @param {number} [mode] - optional octal value about the permission mode for the created
 * folders
 * @private
 */
async function mkdirs(fullPath, mode=0o777){
  let needsToCreate = false;
  // in case the stat fails it will try to recreate the folders
  try{
    await stat(fullPath);
  }
  // otherwise tries to create it
  catch(err){

    // not found
    if (err.code === 'ENOENT'){
      needsToCreate = true;
    }
    else{
      throw err;
    }
  }

  // going through all levels and creating them if necessary
  if (needsToCreate){
    const pathLevels = path.normalize(fullPath).split(path.sep);
    const currentLevels = [];

    for (const level of pathLevels){
      if (level === '' && currentLevels.length === 0){
        currentLevels.push(path.sep);
      }
      else if (level !== ''){
        currentLevels.push(level);
        const currentPath = currentLevels.join(path.sep);

        let needsToCreateCurrentLevel = false;
        try{
          await stat(currentPath); // eslint-disable-line no-await-in-loop
        }
        catch(err){
          // not found
          if (err.code === 'ENOENT'){
            needsToCreateCurrentLevel = true;
          }
          else{
            /* istanbul ignore next */
            throw err;
          }
        }

        if (needsToCreateCurrentLevel){
          await mkdir(currentPath, mode); // eslint-disable-line no-await-in-loop
        }
      }
    }
  }
}

module.exports = mkdirs;

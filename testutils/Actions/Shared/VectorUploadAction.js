const Mebo = require('../../../src');


class VectorUploadAction extends Mebo.Action{
  constructor(){
    super();
    this.createInput('a: text');
    this.createInput('file: filePath[]', {allowedExtensions: ['bin']});
  }

  async _perform(data){
    const checksum = this.createAction('file.checksum');

    checksum.input('file').setValue(data.file[0]);
    const file1 = await checksum.execute();

    checksum.input('file').setValue(data.file[1]);
    const file2 = await checksum.execute();

    checksum.input('file').setValue(data.file[2]);
    const file3 = await checksum.execute();

    const result = {};
    result[this.input('a').name()] = data.a;
    result[this.input('file').basename(0)] = file1;
    result[this.input('file').basename(1)] = file2;
    result[this.input('file').basename(2)] = file3;

    return result;
  }

  async _finalize(err, value){
    // deleting files
    const deleteActionPromises = [];

    for (const fileName of this.input('file').value()){
      const deleteAction = this.createAction('file.delete');
      deleteAction.input('file').setValue(fileName);
      deleteActionPromises.push(deleteAction.execute());
    }

    await Promise.all(deleteActionPromises);

    return Mebo.Action.prototype._finalize.call(this, err, value);
  }
}

module.exports = VectorUploadAction;

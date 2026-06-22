const bcrypt = require('bcryptjs');

async function buatHash() {
    const passwordAsli = '587a397ed64ff1e8d7cd8150c2a28687d3a4ce3f';
    
    // Angka 10 adalah "salt rounds" standar yang menyeimbangkan antara kecepatan dan keamanan
    const saltRounds = 10; 
    
    try {
        const hash = await bcrypt.hash(passwordAsli, saltRounds);
        console.log(`Password Asli: ${passwordAsli}`);
        console.log(`Hasil Hash   : ${hash}`);
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    }
}

buatHash();
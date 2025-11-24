#include <emscripten.h>
#include <string.h>
#include <stdlib.h>

// RC4 Key Scheduling Algorithm (KSA)
void rc4_init(unsigned char *S, const unsigned char *key, int keylen) {
    int i, j = 0;
    unsigned char temp;
    
    // Initialize the state array
    for (i = 0; i < 256; i++) {
        S[i] = i;
    }
    
    // Scramble the state array using the key
    for (i = 0; i < 256; i++) {
        j = (j + S[i] + key[i % keylen]) % 256;
        // Swap S[i] and S[j]
        temp = S[i];
        S[i] = S[j];
        S[j] = temp;
    }
}

// RC4 Pseudo-Random Generation Algorithm (PRGA)
void rc4_crypt(unsigned char *S, unsigned char *data, int datalen) {
    int i = 0, j = 0, k;
    unsigned char temp;
    
    for (k = 0; k < datalen; k++) {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        
        // Swap S[i] and S[j]
        temp = S[i];
        S[i] = S[j];
        S[j] = temp;
        
        // XOR the data with the keystream
        data[k] ^= S[(S[i] + S[j]) % 256];
    }
}

// Exposed function for JavaScript to call
EMSCRIPTEN_KEEPALIVE
unsigned char* rc4_process(const char *input, int inputLen, const char *key, int keyLen) {
    unsigned char S[256];
    unsigned char *output = (unsigned char*)malloc(inputLen);
    
    if (output == NULL) {
        return NULL;
    }
    
    // Copy input to output
    memcpy(output, input, inputLen);
    
    // Initialize RC4
    rc4_init(S, (const unsigned char*)key, keyLen);
    
    // Encrypt/Decrypt
    rc4_crypt(S, output, inputLen);
    
    return output;
}

// Function to allocate memory
EMSCRIPTEN_KEEPALIVE
unsigned char* allocate_memory(int size) {
    return (unsigned char*)malloc(size);
}

// Function to free memory
EMSCRIPTEN_KEEPALIVE
void free_memory(void *ptr) {
    free(ptr);
}
<?php

namespace App\Services;

class NanoidService
{
    // Алфавит из 64 безопасных для URL символов (без дефисов в начале/конце, читабельный)
    private const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_~';

    /**
     * Генерирует криптографически стойкий идентификатор указанной длины.
     *
     * @param int $size Длина токена (по умолчанию 11 символов)
     * @return string
     */
    public static function generate(int $size = 11): string
    {
        $alphabet = self::ALPHABET;
        $alphabetLength = strlen($alphabet);
        $result = '';

        $bytes = random_bytes($size);
        for ($i = 0; $i < $size; $i++) {
            $charIndex = ord($bytes[$i]) % $alphabetLength;
            $result .= $alphabet[$charIndex];
        }

        return $result;
    }
}

<?php
class Validator {
    public static function checkRequired($data, $fields) {
        foreach ($fields as $field) {
            if (!isset($data[$field])) throw new Exception("Field $field wajib diisi");
        }
    }
}
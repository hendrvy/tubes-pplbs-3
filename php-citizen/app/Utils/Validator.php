<?php
class Validator {
    public static function validateRequired($data, $fields) {
        foreach ($fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') return false;
        }
        return true;
    }
}
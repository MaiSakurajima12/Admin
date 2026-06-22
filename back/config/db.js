
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY ;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn("Aviso: usando valores por defecto para Supabase. Añade SUPABASE_URL y SUPABASE_KEY en back/.env para mayor seguridad.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

/*
-- 1. EXTENSIONES (Para generar IDs únicos y seguros)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE USUARIOS
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Aquí guardarás el hash de la contraseña
  rol TEXT CHECK (rol IN ('profesor', 'estudiante')) NOT NULL DEFAULT 'estudiante',
  avatar_url TEXT, -- URL de la foto de perfil en Storage
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE CLASES (Creadas por profesores)
CREATE TABLE clases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_clase TEXT NOT NULL,
  seccion TEXT,
  materia TEXT,
  aula TEXT,
  codigo_acceso TEXT UNIQUE NOT NULL, -- El código de 6-7 caracteres tipo Classroom
  profesor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  portada_url TEXT, -- Imagen de banner de la clase
  color_tema TEXT DEFAULT '#1a73e8',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE INSCRIPCIONES (Relación Alumno <-> Clase)
CREATE TABLE inscripciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
  estudiante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_union TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clase_id, estudiante_id) -- Impide que un alumno se inscriba dos veces a la misma clase
);

-- 5. TABLA DE ANUNCIOS (El "Tablón")
CREATE TABLE anuncios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  contenido TEXT NOT NULL,
  archivo_adjunto_url TEXT, -- Para compartir archivos en el tablón
  fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE TAREAS (Trabajo de clase)
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  puntos_maximos INT DEFAULT 100,
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  archivo_guia_url TEXT, -- PDF o material que sube el profe
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE ENTREGAS (Lo que envían los alumnos)
CREATE TABLE entregas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
  estudiante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  archivo_entrega_url TEXT NOT NULL, -- El trabajo del alumno en Storage
  comentario_alumno TEXT,
  calificacion DECIMAL(5,2),
  comentario_profesor TEXT,
  estado TEXT CHECK (estado IN ('entregado', 'no_entregado', 'calificado')) DEFAULT 'entregado',
  fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tarea_id, estudiante_id) -- Un alumno solo puede entregar una vez por tarea
);
*/
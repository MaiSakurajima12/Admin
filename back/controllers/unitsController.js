const UnitsModel = require('../model/unitsModel');
const supabase = require('../config/db');

exports.createUnit = async (req, res) => {
    try {
        const { nombre, descripcion, numero_unidad, clase_id } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "No has iniciado sesión" });
        }

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ error: "El nombre de la unidad es obligatorio" });
        }

        if (!clase_id) {
            return res.status(400).json({ error: "La clase es obligatoria" });
        }

        if (!numero_unidad || isNaN(numero_unidad) || numero_unidad <= 0) {
            return res.status(400).json({ error: "El número de unidad debe ser un número positivo" });
        }

        const { data: clase } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', clase_id)
            .single();

        const isProfesor = clase && clase.profesor_id === user.id;

        if (!isProfesor) {
            return res.status(403).json({ error: 'No tienes permiso para crear unidades en esta clase' });
        }

        const { data: lastUnit } = await supabase
            .from('unidades')
            .select('orden')
            .eq('clase_id', clase_id)
            .order('orden', { ascending: false })
            .limit(1);

        const orden = lastUnit && lastUnit.length > 0 ? lastUnit[0].orden + 1 : 1;

        const { data: createdUnit, error: dbError } = await UnitsModel.create({
            clase_id,
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null,
            numero_unidad: parseInt(numero_unidad),
            orden
        });

        if (dbError) throw dbError;

        res.status(201).json({ 
            message: "Unidad creada correctamente",
            data: createdUnit
        });
    } catch (err) {
        console.error("Error al crear unidad:", err);
        
        // Handle Supabase unique constraint violation
        if (err.code === '23505') {
            return res.status(400).json({ 
                error: "Ya existe una unidad con ese número en esta clase" 
            });
        }
        
        // Return specific error message if available
        const errorMessage = err.message || err.details || "No se pudo crear la unidad";
        res.status(500).json({ error: errorMessage });
    }
};

exports.getUnitsByClass = async (req, res) => {
    try {
        const { claseId } = req.params;

        if (!claseId) {
            return res.status(400).json({ error: "La clase es obligatoria" });
        }

        const { data, error } = await UnitsModel.getByClass(claseId);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json(data || []);
    } catch (err) {
        console.error("Error al obtener unidades:", err);
        res.status(500).json({ error: "No se pudieron obtener las unidades" });
    }
};

exports.updateUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, numero_unidad } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "No has iniciado sesión" });
        }

        const { data: unit } = await UnitsModel.getById(id);

        if (!unit) {
            return res.status(404).json({ error: "Unidad no encontrada" });
        }

        const { data: clase } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', unit.clase_id)
            .single();

        if (!clase || clase.profesor_id !== user.id) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta unidad' });
        }

        const { data: updatedUnit, error: dbError } = await UnitsModel.update(id, {
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null,
            numero_unidad: parseInt(numero_unidad),
            orden: unit.orden
        });

        if (dbError) throw dbError;

        res.json({ 
            message: "Unidad actualizada correctamente",
            data: updatedUnit
        });
    } catch (err) {
        console.error("Error al actualizar unidad:", err);
        res.status(500).json({ error: "No se pudo actualizar la unidad" });
    }
};

exports.deleteUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "No has iniciado sesión" });
        }

        const { data: unit } = await UnitsModel.getById(id);

        if (!unit) {
            return res.status(404).json({ error: "Unidad no encontrada" });
        }

        const { data: clase } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', unit.clase_id)
            .single();

        if (!clase || clase.profesor_id !== user.id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta unidad' });
        }

        const { error } = await UnitsModel.delete(id);
        if (error) throw error;

        res.json({ message: "Unidad eliminada correctamente" });
    } catch (err) {
        console.error("Error al eliminar unidad:", err);
        res.status(500).json({ error: "No se pudo eliminar la unidad" });
    }
};

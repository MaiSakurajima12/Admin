const RubricModel = require('../model/rubricModel');
const supabase = require('../config/db');

async function verifyTeacherForRubric(user, rubricaId) {
    const { data: tareaLink, error: tareaLinkError } = await RubricModel.getTaskByRubricId(rubricaId);
    if (tareaLinkError) throw tareaLinkError;

    if (!tareaLink || !tareaLink.tarea_id) {
        return true;
    }

    const { data: tarea, error: tareaError } = await supabase
        .from('tareas')
        .select('clase_id')
        .eq('id', tareaLink.tarea_id)
        .single();
    if (tareaError) throw tareaError;

    const { data: clase, error: claseError } = await supabase
        .from('clases')
        .select('profesor_id')
        .eq('id', tarea.clase_id)
        .single();
    if (claseError) throw claseError;

    return clase && clase.profesor_id === user.id;
}

exports.getAllRubrics = async (req, res) => {
    try {
        const { data, error } = await RubricModel.getAll();

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("Error al obtener rúbricas estándar:", err);
        res.status(500).json({ error: "No se pudieron obtener las rúbricas" });
    }
};

exports.getRubricsByClass = async (req, res) => {
    try {
        const { claseId } = req.params;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: clase, error: claseError } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', claseId)
            .single();

        if (claseError) throw claseError;
        if (!clase) {
            return res.status(404).json({ error: "Clase no encontrada" });
        }

        const { data, error } = await RubricModel.getByClass(claseId);

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("Error al obtener rúbricas de clase:", err);
        res.status(500).json({ error: "No se pudieron obtener las rúbricas" });
    }
};

exports.createGlobalRubric = async (req, res) => {
    try {
        const { criterio, descripcion, puntos_maximos, tarea_id, clase_id } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        let claseIdToUse = clase_id;

      
        if (clase_id) {
            const { data: clase, error: claseError } = await supabase
                .from('clases')
                .select('profesor_id')
                .eq('id', clase_id)
                .single();

            if (claseError || !clase) {
                return res.status(404).json({ error: "Clase no encontrada" });
            }

            if (clase.profesor_id !== user.id) {
                return res.status(403).json({ error: "No tienes permiso para crear rúbricas en esta clase" });
            }

            claseIdToUse = clase_id;
        }

       
        if (tarea_id && !clase_id) {
            const { data: tarea } = await supabase
                .from('tareas')
                .select('clase_id')
                .eq('id', tarea_id)
                .single();

            if (tarea) {
                claseIdToUse = tarea.clase_id;

                
                const { data: clase } = await supabase
                    .from('clases')
                    .select('profesor_id')
                    .eq('id', tarea.clase_id)
                    .single();

                if (!clase || clase.profesor_id !== user.id) {
                    return res.status(403).json({ error: "No tienes permiso para esta operación" });
                }
            }
        }

        if (!Number.isFinite(Number(puntos_maximos)) || Number(puntos_maximos) < 1 || Number(puntos_maximos) > 100) {
            return res.status(400).json({ error: 'Los puntos máximos de la rúbrica deben estar entre 1 y 100' });
        }

        const { data, error } = await RubricModel.create({
            criterio,
            descripcion,
            puntos_maximos,
            orden: 0,
            clase_id: claseIdToUse || null
        });

        if (error) throw error;

        const createdRubric = data?.[0];

        if (tarea_id && createdRubric?.id) {
            const { data: tarea } = await supabase
                .from('tareas')
                .select('clase_id')
                .eq('id', tarea_id)
                .single();

            if (!tarea) {
                return res.status(404).json({ error: "Tarea no encontrada" });
            }

            const { error: assignmentError } = await RubricModel.assignRubricToTask(tarea_id, createdRubric.id);
            if (assignmentError) throw assignmentError;
        }

        res.status(201).json(createdRubric);
    } catch (err) {
        console.error("Error al crear rúbrica:", err);
        res.status(500).json({ error: "No se pudo crear la rúbrica" });
    }
};

exports.createRubric = async (req, res) => {
    try {
        const { tarea_id, criterio, descripcion, puntos_maximos, orden } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: tarea } = await supabase
            .from('tareas')
            .select('clase_id')
            .eq('id', tarea_id)
            .single();

        if (!tarea) {
            return res.status(404).json({ error: "Tarea no encontrada" });
        }

        const { data: clase } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', tarea.clase_id)
            .single();

        if (!clase || clase.profesor_id !== user.id) {
            return res.status(403).json({ error: "No tienes permiso para agregar rúbricas" });
        }

        if (!Number.isFinite(Number(puntos_maximos)) || Number(puntos_maximos) < 1 || Number(puntos_maximos) > 100) {
            return res.status(400).json({ error: 'Los puntos máximos de la rúbrica deben estar entre 1 y 100' });
        }

        const { data, error } = await RubricModel.create({
            criterio,
            descripcion,
            puntos_maximos,
            orden
        });

        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Error al crear rúbrica:", err);
        res.status(500).json({ error: "No se pudo crear la rúbrica" });
    }
};

exports.getRubricsByTask = async (req, res) => {
    try {
        const { tareaId } = req.params;

        const { data, error } = await RubricModel.getByTaskId(tareaId);

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("Error al obtener rúbricas:", err);
        res.status(500).json({ error: "No se pudieron obtener las rúbricas" });
    }
};

exports.getRubricLevels = async (req, res) => {
    try {
        const { rubricaId } = req.params;
        const { data, error } = await RubricModel.getLevelsByRubric(rubricaId);

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("Error al obtener niveles de rúbrica:", err);
        res.status(500).json({ error: "No se pudieron obtener los niveles" });
    }
};

exports.createRubricLevel = async (req, res) => {
    try {
        const { rubricaId } = req.params;
        const { puntos, titulo, descripcion, orden } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const canEdit = await verifyTeacherForRubric(user, rubricaId);
        if (!canEdit) {
            return res.status(403).json({ error: "No tienes permiso para agregar niveles a esta rúbrica" });
        }

        const { data, error } = await RubricModel.createLevel({
            rubrica_id: rubricaId,
            puntos,
            titulo,
            descripcion,
            orden
        });

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Error al crear nivel de rúbrica:", err);
        res.status(500).json({ error: "No se pudo crear el nivel de rúbrica" });
    }
};

exports.updateRubricLevel = async (req, res) => {
    try {
        const { levelId } = req.params;
        const { puntos, titulo, descripcion, orden } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: level, error: levelError } = await RubricModel.getLevelById(levelId);
        if (levelError) throw levelError;
        if (!level) return res.status(404).json({ error: "Nivel de rúbrica no encontrado" });

        const canEdit = await verifyTeacherForRubric(user, level.rubrica_id);
        if (!canEdit) {
            return res.status(403).json({ error: "No tienes permiso para editar este nivel" });
        }

        const { data, error } = await RubricModel.updateLevel(levelId, {
            puntos,
            titulo,
            descripcion,
            orden
        });

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error("Error al actualizar nivel de rúbrica:", err);
        res.status(500).json({ error: "No se pudo actualizar el nivel" });
    }
};

exports.deleteRubricLevel = async (req, res) => {
    try {
        const { levelId } = req.params;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: level, error: levelError } = await RubricModel.getLevelById(levelId);
        if (levelError) throw levelError;
        if (!level) return res.status(404).json({ error: "Nivel de rúbrica no encontrado" });

        const canEdit = await verifyTeacherForRubric(user, level.rubrica_id);
        if (!canEdit) {
            return res.status(403).json({ error: "No tienes permiso para eliminar este nivel" });
        }

        const { error } = await RubricModel.deleteLevel(levelId);
        if (error) throw error;

        res.json({ message: "Nivel de rúbrica eliminado correctamente" });
    } catch (err) {
        console.error("Error al eliminar nivel de rúbrica:", err);
        res.status(500).json({ error: "No se pudo eliminar el nivel" });
    }
};

exports.updateRubric = async (req, res) => {
    try {
        const { id } = req.params;
        const { criterio, descripcion, puntos_maximos, orden } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: rubrica } = await RubricModel.getById(id);
        if (!rubrica) {
            return res.status(404).json({ error: "Rubrica no encontrada" });
        }

        const canEdit = await verifyTeacherForRubric(user, id);
        if (!canEdit) {
            return res.status(403).json({ error: "No tienes permiso para editar esta rúbrica" });
        }

        if (!Number.isFinite(Number(puntos_maximos)) || Number(puntos_maximos) < 1 || Number(puntos_maximos) > 100) {
            return res.status(400).json({ error: 'Los puntos máximos de la rúbrica deben estar entre 1 y 100' });
        }

        const { data, error } = await RubricModel.update(id, {
            criterio,
            descripcion,
            puntos_maximos,
            orden
        });

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error("Error al actualizar rúbrica:", err);
        res.status(500).json({ error: "No se pudo actualizar la rúbrica" });
    }
};

exports.deleteRubric = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: rubrica } = await RubricModel.getById(id);
        if (!rubrica) {
            return res.status(404).json({ error: "Rubrica no encontrada" });
        }

        const canDelete = await verifyTeacherForRubric(user, id);
        if (!canDelete) {
            return res.status(403).json({ error: "No tienes permiso para eliminar esta rúbrica" });
        }

        const { error } = await RubricModel.delete(id);
        if (error) throw error;

        res.json({ message: "Rubrica eliminada correctamente" });
    } catch (err) {
        console.error("Error al eliminar rúbrica:", err);
        res.status(500).json({ error: "No se pudo eliminar la rúbrica" });
    }
};

exports.getSubmissionGrades = async (req, res) => {
    try {
        const { entregaId } = req.params;

        const { data, error } = await RubricModel.getSubmissionGrades(entregaId);

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error("Error al obtener calificaciones:", err);
        res.status(500).json({ error: "No se pudieron obtener las calificaciones" });
    }
};

exports.gradeSubmissionRubrics = async (req, res) => {
    try {
        const { entregaId } = req.params;
        let { calificaciones } = req.body;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        if (!Array.isArray(calificaciones) && typeof calificaciones === 'object' && calificaciones !== null) {
            calificaciones = Object.entries(calificaciones).map(([rubricaId, puntos_obtenidos]) => ({ rubrica_id: rubricaId, puntos_obtenidos }));
        }

        const { data: entrega } = await supabase
            .from('entregas')
            .select('tarea_id')
            .eq('id', entregaId)
            .single();

        if (!entrega) {
            return res.status(404).json({ error: "Entrega no encontrada" });
        }

        const { data: tarea } = await supabase
            .from('tareas')
            .select('clase_id')
            .eq('id', entrega.tarea_id)
            .single();

        const { data: clase } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', tarea.clase_id)
            .single();

        if (!clase || clase.profesor_id !== user.id) {
            return res.status(403).json({ error: "No tienes permiso para calificar" });
        }

        for (const calificacion of calificaciones) {
            const gradeResult = await RubricModel.gradeRubric(
                entregaId,
                calificacion.rubrica_id,
                Number(calificacion.puntos_obtenidos)
            );

            if (gradeResult.error) throw gradeResult.error;

            if (gradeResult.data && calificacion.nivel_id) {
                const detailResult = await RubricModel.setRubricDetail(
                    gradeResult.data.id,
                    calificacion.nivel_id,
                    Number(calificacion.puntos_obtenidos)
                );
                if (detailResult.error) throw detailResult.error;
            }
        }

        res.json({ message: "Calificaciones guardadas correctamente" });
    } catch (err) {
        console.error("Error al guardar calificaciones:", err);
        res.status(500).json({ error: "No se pudieron guardar las calificaciones" });
    }
};

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const supabase = require('./config/db');

const userRoutes = require('./routes/userRoutes');
const classRoutes = require('./routes/classRoutes');
const assignmentRoutes = require('./routes/assigmentRoutes');
const unitsRoutes = require('./routes/unitsRoutes');
const rubricRoutes = require('./routes/rubricRoutes');
const postRoutes = require('./routes/postRoutes');
const supportRoutes = require('./routes/supportRoutes');
const faqRoutes = require('./routes/faqRoutes');
const adminRoutes = require('./routes/adminRoutes');
const SupportModel = require('./model/supportModel');
const integrationRoutes = require('./routes/integrationRoutes');
const PostModel = require('./model/postModel');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { authenticateToken } = require('./middleware/authMiddleware');
const { isSupport } = require('./middleware/checkSupport');
const { isAdmin } = require('./middleware/checkAdmin');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat', 
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        httpOnly: true, 
        maxAge: 3600000 
    }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../front/views'));

app.use('/public', express.static(path.join(__dirname, '../front/public')));

app.use('/api/auth', userRoutes);
app.use('/api/classes', authenticateToken, classRoutes);
app.use('/api/assignments', authenticateToken, assignmentRoutes);
app.use('/api/units', authenticateToken, unitsRoutes);
app.use('/api/rubrics', authenticateToken, rubricRoutes);
app.use('/api/posts', authenticateToken, postRoutes);
app.use('/api/support', authenticateToken, supportRoutes);
app.use('/api/faqs', authenticateToken, faqRoutes);
app.use('/api/admin', authenticateToken, isAdmin, adminRoutes);
app.use('/api/integrations', authenticateToken, integrationRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/views/index.html'));
});

app.get('/login', (req, res) => {
    res.render('login'); 
});

app.get('/registro', (req, res) => {
    res.render('register'); 
});

app.get('/privacidad', (req, res) => {
    res.render('privacidad');
});

app.get('/terminos', (req, res) => {
    res.render('terminos');
});

app.get('/privacidad', (req, res) => {
    res.render('privacidad');
});

app.get('/terminos', (req, res) => {
    res.render('terminos');
});

app.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = req.user || req.session?.user;

        if (!user) {
            return res.redirect('/login'); 
        }

        const { data: clases, error } = await supabase
            .from('inscripciones')
            .select(`
                clase_id,
                clases (
                    id,
                    nombre_clase,
                    seccion,
                    codigo_acceso,
                    portada_url,
                    profesor_id,
                    profesor:usuarios!profesor_id ( nombre, apellido )
                )
            `)
            .eq('estudiante_id', user.id);

        if (error) throw error;

        const listaClases = clases.map(item => ({
            ...item.clases,
            isProfesor: item.clases.profesor_id === user.id
        }));

        const selectedSection = req.query.section || 'classes';
        res.render('dashboard', { 
            user: user, 
            clases: listaClases || [],
            selectedSection
        });

    } catch (error) {
        console.error("Error en Dashboard:", error);
        res.render('dashboard', { 
            user: req.user || req.session?.user || {}, 
            clases: [] 
        });
    }
});


app.get('/support', authenticateToken, isSupport, async (req, res) => {
    try {
        const user = req.user || req.session?.user;
        res.render('support_dashboard', { user });
    } catch (err) {
        console.error('Error loading support dashboard:', err);
        res.redirect('/dashboard');
    }
});

app.get('/admin', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = req.user || req.session?.user;
        res.render('admin_dashboard', { user });
    } catch (err) {
        console.error('Error rendering admin panel:', err);
        res.redirect('/dashboard');
    }
});

app.get('/support/:id', authenticateToken, isSupport, async (req, res) => {
    try {
        const id = req.params.id;
        const user = req.user || req.session?.user;
        if (!user) return res.redirect('/login');

        const { data: report, error } = await SupportModel.getById(id);
        if (error || !report) {
            console.warn('Report not found for id', id, error);
            return res.redirect('/support');
        }

        let reporter = null;
        try {
            const { data: udata } = await supabase.from('usuarios').select('id, nombre, apellido, email').eq('id', report.usuario_id).single();
            reporter = udata;
        } catch (e) {
            
        }

        res.render('support_detail', { user, report, reporter });
    } catch (err) {
        console.error('Error rendering support detail:', err);
        res.redirect('/support');
    }
});

app.get('/clase/:id', authenticateToken, async (req, res) => {
    try {
        const claseId = req.params.id;
        const user = req.user || req.session?.user || {};

        console.log('Loading class:', claseId, 'for user:', user.id);

        const { data: clase, error: claseError } = await supabase.from('clases').select('*').eq('id', claseId).single();
        if (claseError) {
            console.error('Error loading class:', claseError);
            throw claseError;
        }

        const { data: posts, error: postsError } = await PostModel.getByClass(claseId);
        if (postsError) {
            console.error('Error loading posts:', postsError);
            throw postsError;
        }

        const { data: unidades, error: unidadesError } = await supabase
            .from('unidades')
            .select('*')
            .eq('clase_id', claseId)
            .order('numero_unidad', { ascending: true });
        if (unidadesError) {
            console.error('Error loading units:', unidadesError);
            throw unidadesError;
        }

        const { data: rubricas, error: rubricasError } = await supabase
            .from('rubricas')
            .select('*')
            .order('orden', { ascending: true });
        if (rubricasError) {
            console.error('Error loading rubricas:', rubricasError);
            throw rubricasError;
        }

        const { data: inscritos, error: inscritosError } = await supabase
            .from('inscripciones')
            .select(`
                rol_en_clase,
                usuarios (id, nombre, apellido, avatar_url)
            `)
            .eq('clase_id', claseId);
        if (inscritosError) {
            console.error('Error loading class members:', inscritosError);
            throw inscritosError;
        }

        const profesores = (inscritos || []).filter(i => i.rol_en_clase === 'profesor');
        const alumnos = (inscritos || []).filter(i => i.rol_en_clase === 'estudiante');
        const rolUsuarioEnClase = (inscritos || []).find(i => i.usuarios?.id === user.id)?.rol_en_clase;
        const isProfesor = rolUsuarioEnClase === 'profesor';

        let classPerformance = null;
        let studentsList = [];
        let studentPerformanceMap = {};

        if (isProfesor) {
            const { data: tareas, error: tareasError } = await supabase
                .from('tareas')
                .select('id, fecha_entrega, puntos_maximos')
                .eq('clase_id', claseId);
            if (tareasError) throw tareasError;

            const estudiantes = (alumnos || []).map(i => i.usuarios).filter(Boolean);

            if (tareas && tareas.length > 0 && estudiantes.length > 0) {
                const { data: entregas, error: entregasError } = await supabase
                    .from('entregas')
                    .select('tarea_id, estudiante_id, fecha_envio, calificacion')
                    .in('tarea_id', tareas.map(t => t.id));
                if (entregasError) throw entregasError;

                const entregasMap = new Map();
                entregas?.forEach(e => {
                    entregasMap.set(`${e.tarea_id}-${e.estudiante_id}`, e);
                });

                let entregadasAtiempo = 0;
                let entregadasTarde = 0;
                let noEntregadas = 0;
                let totalCalificaciones = 0;
                let countCalificadas = 0;

                estudiantes.forEach(usuario => {
                    const estudianteId = usuario.id;
                    let estudianteEntregadasAtiempo = 0;
                    let estudianteEntregadasTarde = 0;
                    let estudianteNoEntregadas = 0;
                    let estudianteCalificaciones = 0;
                    let estudianteCountCalificadas = 0;

                    tareas.forEach(tarea => {
                        const key = `${tarea.id}-${estudianteId}`;
                        const entrega = entregasMap.get(key);

                        if (!entrega) {
                            estudianteNoEntregadas++;
                            noEntregadas++;
                        } else {
                            const entregaDate = new Date(entrega.fecha_envio);
                            const deadlineDate = new Date(tarea.fecha_entrega);
                            if (entregaDate <= deadlineDate) {
                                estudianteEntregadasAtiempo++;
                                entregadasAtiempo++;
                            } else {
                                estudianteEntregadasTarde++;
                                entregadasTarde++;
                            }
                            if (entrega.calificacion !== null && entrega.calificacion !== undefined) {
                                estudianteCalificaciones += entrega.calificacion;
                                estudianteCountCalificadas++;
                                totalCalificaciones += entrega.calificacion;
                                countCalificadas++;
                            }
                        }
                    });

                    studentPerformanceMap[estudianteId] = {
                        nombre: usuario.nombre || '',
                        apellido: usuario.apellido || '',
                        avatar_url: usuario.avatar_url,
                        entregadasAtiempo: estudianteEntregadasAtiempo,
                        entregadasTarde: estudianteEntregadasTarde,
                        noEntregadas: estudianteNoEntregadas,
                        promedioCalificacion: estudianteCountCalificadas > 0
                            ? (estudianteCalificaciones / estudianteCountCalificadas).toFixed(2)
                            : '0.00',
                        tareasEntregadas: estudianteEntregadasAtiempo + estudianteEntregadasTarde,
                        tareasCalificadas: estudianteCountCalificadas,
                        porcentajeEntrega: tareas.length > 0
                            ? (((estudianteEntregadasAtiempo + estudianteEntregadasTarde) / tareas.length) * 100).toFixed(1)
                            : 0
                    };

                    studentsList.push({
                        id: estudianteId,
                        nombre: usuario.nombre || '',
                        apellido: usuario.apellido || ''
                    });
                });

                classPerformance = {
                    totalEstudiantes: estudiantes.length,
                    totalTareas: tareas.length,
                    totalEntregas: entregadasAtiempo + entregadasTarde,
                    entregadasAtiempo,
                    entregadasTarde,
                    noEntregadas,
                    porcentajeEntrega: tareas.length * estudiantes.length > 0
                        ? (((entregadasAtiempo + entregadasTarde) / (tareas.length * estudiantes.length)) * 100).toFixed(1)
                        : 0,
                    promedioCalificacion: countCalificadas > 0
                        ? (totalCalificaciones / countCalificadas).toFixed(2)
                        : '0.00',
                    tareasSinCalificar: (entregadasAtiempo + entregadasTarde) - countCalificadas
                };
            }
        }

        const studentPerformanceMapJson = JSON.stringify(studentPerformanceMap || {});

        console.log('Rendering class page for user:', user.id, 'isProfesor:', isProfesor);

        res.render('clase', {
            clase,
            posts: posts || [],
            unidades: unidades || [],
            rubricas: rubricas || [],
            profesores: profesores || [],
            alumnos: alumnos || [],
            user,
            isProfesor,
            classPerformance,
            studentsList,
            studentPerformanceMapJson
        });
    } catch (error) {
        console.error("Error al cargar la clase:", error);
        res.status(500).send("Error al cargar la clase");
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled error middleware:', err && err.message ? err.message : err);
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'El archivo es demasiado grande. Límite: 20MB' });
    }
    if (err && err.name === 'MulterError') {
        return res.status(400).json({ error: err.message || 'Error al procesar el archivo' });
    }
    res.status(err?.status || 500).json({ error: err?.message || 'Error interno del servidor' });
});

app.get('/clase/:id/rendimiento', authenticateToken, async (req, res) => {
    try {
        const claseId = req.params.id;
        const user = req.user || req.session?.user || {}; 

        const { data: clase } = await supabase.from('clases').select('*').eq('id', claseId).single();

        const { data: rolData } = await supabase
            .from('inscripciones')
            .select('rol_en_clase')
            .eq('clase_id', claseId)
            .eq('estudiante_id', user.id)
            .single();

        const isProfesor = rolData?.rol_en_clase === 'profesor';

        let classPerformance = null;
        let studentsList = [];
        let studentPerformanceMap = {};

        if (isProfesor) {
            const { data: tareas, error: tareasError } = await supabase
                .from('tareas')
                .select('id, fecha_entrega, puntos_maximos')
                .eq('clase_id', claseId);

            if (tareasError) throw tareasError;

            const { data: estudiantesInscriptos, error: estudiantesError } = await supabase
                .from('inscripciones')
                .select('estudiante_id')
                .eq('clase_id', claseId)
                .eq('rol_en_clase', 'estudiante');

            if (estudiantesError) throw estudiantesError;

            let estudiantes = [];
            if (estudiantesInscriptos && estudiantesInscriptos.length > 0) {
                const estudianteIds = estudiantesInscriptos.map(e => e.estudiante_id);
                
                const { data: usuariosData, error: usuariosError } = await supabase
                    .from('usuarios')
                    .select('id, nombre, apellido, avatar_url')
                    .in('id', estudianteIds);

                if (usuariosError) throw usuariosError;

                estudiantes = usuariosData || [];
            }

            if (tareas && tareas.length > 0 && estudiantes && estudiantes.length > 0) {
                const { data: entregas, error: entregasError } = await supabase
                    .from('entregas')
                    .select('tarea_id, estudiante_id, fecha_envio, calificacion')
                    .in('tarea_id', tareas.map(t => t.id));

                if (entregasError) throw entregasError;

                const totalEstudiantes = estudiantes.length;
                const totalTareas = tareas.length;
                const totalEntregas = entregas ? entregas.length : 0;
                
                let entregadasAtiempo = 0;
                let entregadasTarde = 0;
                let noEntregadas = 0;
                let totalCalificaciones = 0;
                let countCalificadas = 0;

                const entregasMap = new Map();
                entregas?.forEach(e => {
                    const key = `${e.tarea_id}-${e.estudiante_id}`;
                    entregasMap.set(key, e);
                });

                estudiantes.forEach(usuario => {
                    if (!usuario || !usuario.id) {
                        return;
                    }
                    
                    try {
                        const estudianteId = usuario.id;
                        let estudianteEntregadasAtiempo = 0;
                        let estudianteEntregadasTarde = 0;
                        let estudianteNoEntregadas = 0;
                        let estudianteCalificaciones = 0;
                        let estudianteCountCalificadas = 0;

                        tareas.forEach(tarea => {
                            const key = `${tarea.id}-${estudianteId}`;
                            const entrega = entregasMap.get(key);
                            
                            if (!entrega) {
                                estudianteNoEntregadas++;
                                noEntregadas++;
                            } else {
                                const entregaDate = new Date(entrega.fecha_envio);
                                const deadlineDate = new Date(tarea.fecha_entrega);
                                
                                if (entregaDate <= deadlineDate) {
                                    estudianteEntregadasAtiempo++;
                                    entregadasAtiempo++;
                                } else {
                                    estudianteEntregadasTarde++;
                                    entregadasTarde++;
                                }
                                
                                if (entrega.calificacion !== null && entrega.calificacion !== undefined) {
                                    estudianteCalificaciones += entrega.calificacion;
                                    estudianteCountCalificadas++;
                                    totalCalificaciones += entrega.calificacion;
                                    countCalificadas++;
                                }
                            }
                        });

                        studentPerformanceMap[estudianteId] = {
                            nombre: usuario.nombre || '',
                            apellido: usuario.apellido || '',
                            avatar_url: usuario.avatar_url,
                            entregadasAtiempo: estudianteEntregadasAtiempo,
                            entregadasTarde: estudianteEntregadasTarde,
                            noEntregadas: estudianteNoEntregadas,
                            promedioCalificacion: estudianteCountCalificadas > 0 
                                ? (estudianteCalificaciones / estudianteCountCalificadas).toFixed(2) 
                                : '0.00',
                            tareasEntregadas: estudianteEntregadasAtiempo + estudianteEntregadasTarde,
                            tareasCalificadas: estudianteCountCalificadas,
                            porcentajeEntrega: totalTareas > 0
                                ? (((estudianteEntregadasAtiempo + estudianteEntregadasTarde) / totalTareas) * 100).toFixed(1)
                                : 0
                        };

                        studentsList.push({
                            id: estudianteId,
                            nombre: usuario.nombre || '',
                            apellido: usuario.apellido || ''
                        });
                    } catch (err) {
                        console.error('Error procesando estudiante:', err);
                    }
                });

                classPerformance = {
                    totalEstudiantes,
                    totalTareas,
                    totalEntregas,
                    entregadasAtiempo,
                    entregadasTarde,
                    noEntregadas,
                    porcentajeEntrega: totalTareas * totalEstudiantes > 0 
                        ? ((totalEntregas / (totalTareas * totalEstudiantes)) * 100).toFixed(1) 
                        : 0,
                    promedioCalificacion: countCalificadas > 0 
                        ? (totalCalificaciones / countCalificadas).toFixed(2) 
                        : 0,
                    tareasSinCalificar: totalEntregas - countCalificadas
                };
            }
        }

        const studentPerformanceMapJson = JSON.stringify(studentPerformanceMap || {});

        res.render('rendimiento', { 
            clase, 
            user, 
            isProfesor, 
            classPerformance: classPerformance || null, 
            studentsList: studentsList || [], 
            studentPerformanceMapJson
        });
    } catch (error) {
        console.error("Error al cargar rendimiento:", error);
        res.status(500).send("Error al cargar rendimiento");
    }
});

app.get('/clase/:id/tareas', authenticateToken, async (req, res) => {
    try {
        const claseId = req.params.id;
        const user = req.user || req.session?.user || {};
        const { data: clase } = await supabase.from('clases').select('*').eq('id', claseId).single();
        
        const { data: tareas } = await supabase
            .from('tareas')
            .select(`
                *,
                unidades:unidad_id (id, nombre, numero_unidad, descripcion)
            `)
            .eq('clase_id', claseId)
            .order('fecha_creacion', { ascending: false });

        const { data: unidades } = await supabase
            .from('unidades')
            .select('*')
            .eq('clase_id', claseId)
            .order('numero_unidad', { ascending: true });

        const { data: rubricas } = await supabase
            .from('rubricas')
            .select('*')
            .order('orden', { ascending: true });

        const { data: rolData } = await supabase
            .from('inscripciones')
            .select('rol_en_clase')
            .eq('clase_id', claseId)
            .eq('estudiante_id', user.id)
            .single();

        const isProfesor = rolData?.rol_en_clase === 'profesor';

        const tareasAgrupadas = {};
        const tareasTotal = tareas || [];
        
        (unidades || []).forEach(unidad => {
            tareasAgrupadas[unidad.id] = {
                unidad: unidad,
                tareas: tareasTotal.filter(t => t.unidad_id === unidad.id)
            };
        });

        const tareassSinUnidad = tareasTotal.filter(t => !t.unidad_id);

        res.render('tareas', {
            clase,
            tareasAgrupadas,
            tareassSinUnidad,
            unidades: unidades || [],
            rubricas: rubricas || [],
            user,
            isProfesor
        });
    } catch (error) {
        console.error('Error al cargar tareas:', error);
        res.status(500).send("Error al cargar tareas");
    }
});

app.get('/clase/:id/entregadas', authenticateToken, async (req, res) => {
    try {
        res.redirect('/dashboard?section=submissions');
    } catch (error) {
        console.error('Error redirigiendo a entregadas:', error);
        res.status(500).send('Error al redirigir a Mis entregas');
    }
});

app.get('/tarea/:id', authenticateToken, async (req, res) => {
    try {
        const tareaId = req.params.id;
        const user = req.user || req.session?.user || { id: null };

        const { data: tarea } = await supabase
            .from('tareas')
            .select('*, clases(nombre_clase, profesor:usuarios!profesor_id(nombre, apellido))')
            .eq('id', tareaId)
            .single();

        const { data: rolData } = await supabase
            .from('inscripciones')
            .select('rol_en_clase')
            .eq('clase_id', tarea.clase_id)
            .eq('estudiante_id', user.id)
            .single();

        const rol = rolData ? rolData.rol_en_clase : 'estudiante';

        let entregas = null;
        let entrega = null;
        let alumnosConEstado = null;

        if (rol === 'profesor') {
            const { data: inscritos } = await supabase
                .from('inscripciones')
                .select('usuarios(*)')
                .eq('clase_id', tarea.clase_id)
                .eq('rol_en_clase', 'estudiante');

            const { data: allEntregas } = await supabase
                .from('entregas')
                .select('*, estudiante:usuarios(nombre, apellido)')
                .eq('tarea_id', tareaId);
            
            const estudiantesInscritos = (inscritos || []).map(ins => ins.usuarios.id);
            entregas = (allEntregas || []).filter(e => estudiantesInscritos.includes(e.estudiante_id));

            alumnosConEstado = (inscritos || []).map(ins => {
                const entrega = (entregas || []).find(e => e.estudiante_id === ins.usuarios.id);
                return {
                    ...ins.usuarios,
                    entrega: entrega || null
                };
            });
        } else {
            const { data: userEntrega } = await supabase
                .from('entregas')
                .select('*')
                .eq('tarea_id', tareaId)
                .eq('estudiante_id', user.id)
                .single();
            entrega = userEntrega;
        }

        res.render('detalle_tarea', { tarea, entrega, entregas, alumnosConEstado, rol, user });
    } catch (error) {
        console.error("Error al cargar tarea:", error);
        res.status(500).send("Error al cargar la tarea");
    }
});

app.get('/tarea/:id/revision', authenticateToken, async (req, res) => {
    try {
        const tareaId = req.params.id;
        const { data: tarea } = await supabase.from('tareas').select('*').eq('id', tareaId).single();

        const { data: inscritos } = await supabase
            .from('inscripciones')
            .select('usuarios(*)')
            .eq('clase_id', tarea.clase_id)
            .eq('rol_en_clase', 'estudiante');

        const { data: entregas } = await supabase
            .from('entregas')
            .select('*')
            .eq('tarea_id', tareaId);

        const alumnosConEstado = (inscritos || []).map(ins => {
            const entrega = (entregas || []).find(e => e.estudiante_id === ins.usuarios.id);
            return {
                ...ins.usuarios,
                entrega: entrega || null,
                puntos_maximos_tarea: tarea.puntos_maximos
            };
        });

        res.render('ver_entregas', { tarea, alumnos: alumnosConEstado });
    } catch (error) {
        res.status(500).send("Error en la revisión");
    }
});
app.get('/clase/:id/personas', authenticateToken, async (req, res) => {
    try {
        const claseId = req.params.id;
        const user = req.user || req.session?.user || {};

        const { data: clase } = await supabase
            .from('clases')
            .select('*')
            .eq('id', claseId)
            .single();

        const { data: inscritos, error } = await supabase
            .from('inscripciones')
            .select(`
                rol_en_clase,
                usuarios (
                    id,
                    nombre,
                    apellido,
                    avatar_url
                )
            `)
            .eq('clase_id', claseId);

        if (error) throw error;

        const profesores = inscritos.filter(i => i.rol_en_clase === 'profesor');
        const alumnos = inscritos.filter(i => i.rol_en_clase === 'estudiante');

        const rolUsuarioEnClase = inscritos.find(i => i.usuarios.id === user.id)?.rol_en_clase;
        const isProfesor = rolUsuarioEnClase === 'profesor';

        res.render('personas', { 
            clase, 
            profesores, 
            alumnos, 
            user, 
            isProfesor
        });

    } catch (error) {
        console.error("Error en Personas:", error);
        res.status(500).send("Error al cargar la lista de personas");
    }
});
app.get('/perfil', authenticateToken, (req, res) => {
    res.render('perfil', { user: req.user || req.session?.user || {} });
});

app.get('/mis-reportes', authenticateToken, (req, res) => {
    res.render('support_reports', { user: req.user || req.session?.user || {} });
});
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login'); 
    });
});
const PORT = process.env.PORT || 3000;

if (process.env.VERCEL) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Uxmal corriendo en http://localhost:${PORT}`);
    });
}